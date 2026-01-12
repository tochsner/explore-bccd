import type { BCCD } from './bccd';
import { fingerprint, getLeafNames, isLeaf, isRoot, type Clade } from './clade';
import { logNormalPointEstimate, logNormalSample } from './logNormalDistribution';
import type { CladeSplit } from './cladeSplit';
import { betaLogDensity, betaPointEstimate, betaSample } from './betaDistribution';
import {
	type TreeToDraw,
	type NodeToDraw,
	type LeafToDraw,
	type InternalNodeToDraw,
	getCladeLabels
} from './treeToDraw';
import { getHistogram } from './histogram';

export class BCCDPointEstimator {
	bccd: BCCD;

	splitSubtreeLogDensities: Map<number, number>;

	cladeSubtreeHeights: Map<number, number>;
	splitSubtreeHeights: Map<number, number>;

	pointEstimate: TreeToDraw;
	pointEstimateNodes: Map<number, NodeToDraw>;

	bestSplitsPerClade: Map<number, CladeSplit>;
	bestSplitProbabilityPerClade: Map<number, number>;

	cladeToNodeNr: Map<number, number>;
	nodeNrToClade: Map<number, Clade>;
	runningNodeNumber: number;

	constructor(bccd: BCCD) {
		this.bccd = bccd;
		this.splitSubtreeLogDensities = new Map();
		this.cladeSubtreeHeights = new Map();
		this.splitSubtreeHeights = new Map();
		this.bestSplitsPerClade = new Map();
		this.bestSplitProbabilityPerClade = new Map();
		this.nodeNrToClade = new Map();
		this.cladeToNodeNr = new Map();
		this.pointEstimateNodes = new Map();
		this.runningNodeNumber = 0;

		this.collectCladeSubtreeLogDensities(bccd.rootClade);
		this.cladeSubtreeHeights.set(this.bccd.rootClade.fingerprint, 1.0);

		this.pointEstimate = this.buildPointEstimate();
	}

	private buildPointEstimate(): TreeToDraw {
		const treeHeight = logNormalPointEstimate(this.bccd.treeHeightDistribution);

		this.runningNodeNumber = 0;
		const pointEstimate = {
			root: this.buildCladeSubtree(this.bccd.rootClade, treeHeight, 'pointEstimate').node
		};

		this.sampleHeightDistributions(pointEstimate);

		return pointEstimate;
	}

	getMostLikelyCladeSplits(cladeNr: number): {
		leftLabels: string[];
		rightLabels: string[];
		logDensity: number;
	}[] {
		const clade = this.nodeNrToClade.get(cladeNr);
		if (clade === undefined) return [];

		return (
			(this.bccd.splitsPerClade.get(clade.fingerprint) || [])
				.values()
				.toArray()
				// get all possible splits
				.map((fingerprint) => this.bccd.splits.get(fingerprint))
				.filter((split) => !!split)
				// attach local log densities
				.map((split) => ({
					...split,
					logDensity: this.getLocalSplitLogDensity(split)
				}))
				// sort by density
				.sort((a, b) => b.logDensity - a.logDensity)
				// take the five most likely
				.slice(0, 5)
				.map((split) => {
					return {
						leftLabels: getLeafNames(this.bccd, split.clade1),
						rightLabels: getLeafNames(this.bccd, split.clade2),
						logDensity: split.logDensity
					};
				})
		);
	}

	private collectCladeSubtreeLogDensities(clade: Clade) {
		if (isLeaf(clade)) {
			this.cladeSubtreeHeights.set(clade.fingerprint, 0.0);
			return 0;
		}

		let bestSplitLogDensity = Number.NEGATIVE_INFINITY;
		let bestSplit: CladeSplit | null = null;

		const possibleSplits = this.bccd.splitsPerClade.get(clade.fingerprint);

		for (const splitFingerprint of possibleSplits || []) {
			const split = this.bccd.splits.get(splitFingerprint);
			if (!split) continue;

			const logDensity = this.collectSplitSubtreeLogDensities(split);

			if (bestSplitLogDensity < logDensity) {
				bestSplit = split;
				bestSplitLogDensity = logDensity;
			}
		}

		if (bestSplit === null) {
			throw new Error('Clade with no splits encounterd. This should not happen.');
		}

		this.bestSplitsPerClade.set(clade.fingerprint, bestSplit);
		this.cladeSubtreeHeights.set(
			clade.fingerprint,
			this.splitSubtreeHeights.get(bestSplit.fingerprint) || 0.0
		);

		return bestSplitLogDensity;
	}

	private collectSplitSubtreeLogDensities(split: CladeSplit) {
		const existingSplitSubtreeLogDensities = this.splitSubtreeLogDensities.get(split.fingerprint);
		if (existingSplitSubtreeLogDensities !== undefined) {
			return existingSplitSubtreeLogDensities;
		}

		// recursively get the max log density of the two sub clades

		const bestLogDensityClade1 = this.collectCladeSubtreeLogDensities(split.clade1);
		const bestLogDensityClade2 = this.collectCladeSubtreeLogDensities(split.clade2);

		// compute log log density of having this split in the CCD

		const localCCDLogDensity =
			Math.log(this.bccd.numSplitOccurrences.get(split.fingerprint) || 0) -
			Math.log(this.bccd.numCladeOccurrences.get(split.parent.fingerprint) || 0);

		// compute the local branch embedding log density of the point estimate

		let localHSBLogDensity;

		if (isRoot(split.parent)) {
			// the tree embedding for the root is the tree height
			// this is independent of the actual split chose, so we don't include it here
			localHSBLogDensity = 0.0;
		} else {
			const betaParameters = this.bccd.splitRatioDistributions.get(split.fingerprint);

			if (betaParameters === undefined) {
				throw new Error('Split with no estimated parameters encountered. This should not happen.');
			}

			const ratioPointEstimate = betaPointEstimate(betaParameters);
			const pointEstimateLogDensity = betaLogDensity(ratioPointEstimate, betaParameters);

			const olderChildHeight = Math.max(
				this.cladeSubtreeHeights.get(split.clade1.fingerprint) || 0.0,
				this.cladeSubtreeHeights.get(split.clade2.fingerprint) || 0.0
			);

			const jacobianCorrection = -Math.log(1.0 - olderChildHeight);

			localHSBLogDensity = pointEstimateLogDensity + jacobianCorrection;

			const subtreeHeight = olderChildHeight + (1.0 - olderChildHeight) * ratioPointEstimate;
			this.splitSubtreeHeights.set(split.fingerprint, subtreeHeight);
		}

		const splitDensity =
			bestLogDensityClade1 + bestLogDensityClade2 + localCCDLogDensity + localHSBLogDensity;
		this.splitSubtreeLogDensities.set(split.fingerprint, splitDensity);

		return splitDensity;
	}

	private sampleHeightDistributions(treeToDraw: TreeToDraw) {
		const numSamples = 10_000;

		const heightsPerNode = new Map<number, number[]>();
		for (let i = 0; i < numSamples; i++) {
			const treeHeight = logNormalSample(this.bccd.treeHeightDistribution);

			this.runningNodeNumber = 0;
			const { node } = this.buildCladeSubtree(this.bccd.rootClade, treeHeight, 'sample');

			// collect height samples per node nr

			collectHeightsPerNode(node);
			function collectHeightsPerNode(node: NodeToDraw) {
				if (!heightsPerNode.has(node.nr)) heightsPerNode.set(node.nr, []);
				heightsPerNode.get(node.nr)?.push(node.height);

				if (node.type === 'internal') {
					collectHeightsPerNode(node.left);
					collectHeightsPerNode(node.right);
				}
			}
		}
		// set histogram

		setHistograms(treeToDraw.root);
		function setHistograms(node: NodeToDraw) {
			if (node.type === 'leaf') return;

			const heightSamples = heightsPerNode.get(node.nr) || [];
			const histogram = getHistogram(heightSamples);
			node.heightDistribution = histogram;

			setHistograms(node.left);
			setHistograms(node.right);
		}
	}

	private buildCladeSubtree(
		clade: Clade,
		treeHeight: number,
		samplingMethod: 'pointEstimate' | 'sample'
	): { node: NodeToDraw; height: number } {
		if (isLeaf(clade)) {
			const height = 0.0;
			const node: LeafToDraw = {
				type: 'leaf',
				nr: this.runningNodeNumber++,
				height,
				label: clade.label
			};

			if (samplingMethod === 'pointEstimate') {
				this.nodeNrToClade.set(node.nr, clade);
				this.cladeToNodeNr.set(clade.fingerprint, node.nr);
				this.pointEstimateNodes.set(node.nr, node);
			}

			return { node, height };
		}

		// find best split

		const bestSplit = this.bestSplitsPerClade.get(clade.fingerprint);
		if (bestSplit === undefined) {
			throw new Error('No best split for clade found. This should not happen.');
		}

		// build children

		const { node: child1, height: childHeight1 } = this.buildCladeSubtree(
			bestSplit.clade1,
			treeHeight,
			samplingMethod
		);
		const { node: child2, height: childHeight2 } = this.buildCladeSubtree(
			bestSplit.clade2,
			treeHeight,
			samplingMethod
		);

		// get height

		let height;

		if (isRoot(clade)) {
			height = treeHeight;
		} else {
			const betaParameters = this.bccd.splitRatioDistributions.get(bestSplit.fingerprint);
			if (betaParameters === undefined) {
				throw new Error('No distribution found for clade. This should not happen.');
			}

			let branchFraction;
			if (samplingMethod === 'pointEstimate') {
				branchFraction = betaPointEstimate(betaParameters);
			} else {
				branchFraction = betaSample(betaParameters);
			}

			const olderChildHeight = Math.max(childHeight1, childHeight2);
			const branchLength = (treeHeight - olderChildHeight) * branchFraction;
			height = olderChildHeight + branchLength;
		}

		const node: InternalNodeToDraw = {
			type: 'internal',
			nr: this.runningNodeNumber++,
			height,
			left: child1,
			right: child2,
			heightDistribution: []
		};

		if (samplingMethod === 'pointEstimate') {
			this.nodeNrToClade.set(node.nr, clade);
			this.cladeToNodeNr.set(clade.fingerprint, node.nr);
			this.pointEstimateNodes.set(node.nr, node);
		}

		return { node, height };
	}

	private getLocalSplitLogDensity(split: CladeSplit) {
		const localCCDLogDensity =
			Math.log(this.bccd.numSplitOccurrences.get(split.fingerprint) || 0) -
			Math.log(this.bccd.numCladeOccurrences.get(split.parent.fingerprint) || 0);

		const betaParameters = this.bccd.splitRatioDistributions.get(split.fingerprint);

		if (betaParameters === undefined) {
			throw new Error('Split with no estimated parameters encountered. This should not happen.');
		}

		const ratioPointEstimate = betaPointEstimate(betaParameters);
		const pointEstimateLogDensity = betaLogDensity(ratioPointEstimate, betaParameters);

		return localCCDLogDensity + pointEstimateLogDensity;
	}
}
