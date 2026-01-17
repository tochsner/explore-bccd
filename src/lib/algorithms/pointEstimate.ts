import type { BCCD } from './bccd';
import { getLeafNames, isLeaf, isRoot, type Clade } from './clade';
import {
	logNormalLogDensity,
	logNormalPointEstimate,
	logNormalSample
} from './logNormalDistribution';
import type { CladeSplit } from './cladeSplit';
import { betaLogDensity, betaPointEstimate, betaSample } from './betaDistribution';
import {
	type TreeToDraw,
	type NodeToDraw,
	type LeafToDraw,
	type InternalNodeToDraw,
	type NodeDetails,
	getCladeLabels
} from './treeToDraw';
import { getHistogram } from './histogram';

export class BCCDPointEstimator {
	bccd: BCCD;

	splitSubtreeLogDensities: Map<number, number>;

	cladeSubtreeHeights: Map<number, number>;
	splitSubtreeHeights: Map<number, number>;

	bestSplitsPerClade: Map<number, CladeSplit>;
	bestSplitProbabilityPerClade: Map<number, number>;

	pointEstimate!: TreeToDraw;
	pointEstimateNodes: Map<number, NodeToDraw>;
	cladeToNodeNr: Map<number, number>;
	nodeNrToClade: Map<number, Clade>;

	conditionedSplits: Map<number, CladeSplit>;
	conditionedHeights: Map<number, number>;

	runningNodeNumber: number;

	constructor(bccd: BCCD) {
		this.bccd = bccd;
		this.splitSubtreeLogDensities = new Map();
		this.cladeSubtreeHeights = new Map();
		this.splitSubtreeHeights = new Map();
		this.bestSplitsPerClade = new Map();
		this.bestSplitProbabilityPerClade = new Map();
		this.nodeNrToClade = new Map();
		this.conditionedSplits = new Map();
		this.conditionedHeights = new Map();
		this.cladeToNodeNr = new Map();
		this.pointEstimateNodes = new Map();
		this.runningNodeNumber = 0;

		this.collectCladeSubtreeLogDensities(bccd.rootClade);
		this.cladeSubtreeHeights.set(this.bccd.rootClade.fingerprint, 1.0);

		this.updatePointEstimate();
	}

	/** public getters and setters */

	conditionOnSplit(nodeNr: number, splitFingerprint: number) {
		const clade = this.nodeNrToClade.get(nodeNr);
		if (!clade) {
			throw new Error('Trying to condition for unknown clade. This should not happen.');
		}

		const split = this.bccd.splits.get(splitFingerprint);
		if (!split) {
			throw new Error('Trying to condition on unknown split. This should not happen.');
		}

		this.conditionedSplits.set(clade.fingerprint, split);

		this.updatePointEstimate();
	}

	removeConditioningOnSplit(cladeFingerprint: number) {
		this.conditionedSplits.delete(cladeFingerprint);
		this.updatePointEstimate();
	}

	conditionOnHeight(nodeNr: number, height: number) {
		const clade = this.nodeNrToClade.get(nodeNr);
		if (!clade) {
			throw new Error('Trying to condition for unknown clade. This should not happen.');
		}

		this.conditionedHeights.set(clade.fingerprint, height);

		this.updatePointEstimate();
	}

	removeConditioningOnHeight(cladeFingerprint: number) {
		this.conditionedHeights.delete(cladeFingerprint);
		this.updatePointEstimate();
	}

	getNodeDetails(nodeNr: number): NodeDetails {
		const clade = this.nodeNrToClade.get(nodeNr);
		if (!clade) {
			throw new Error('Details requested for unknown node. This should not happen.');
		}

		const nodeToDraw = this.pointEstimateNodes.get(nodeNr);
		if (!nodeToDraw) {
			throw new Error('Details requested for unknown node. This should not happen.');
		}

		if (nodeToDraw.type === 'leaf') {
			throw new Error('Details requested for leaf. This is not supported.');
		}

		const selectedSplit =
			this.conditionedSplits.get(clade.fingerprint) ||
			this.bestSplitsPerClade.get(clade.fingerprint);
		if (!selectedSplit) {
			throw new Error('No split for clade found. This should not happen.');
		}

		const alternativeSplits = (this.bccd.splitsPerClade.get(clade.fingerprint) || [])
			.values()
			.toArray()
			// get all possible splits
			.map((fingerprint) => this.bccd.splits.get(fingerprint))
			.filter((split) => !!split)
			// attach local log densities
			.map((split) => ({
				...split,
				logDensity: this.getUnnormalizedLocalSplitLogDensity(split)
			}))
			// sort by density
			.sort((a, b) => b.logDensity - a.logDensity)
			// take the four most likely
			.slice(0, 4)
			// mark the best split
			.map((split, idx) => ({
				...split,
				isBestSplit: idx === 0
			}))
			// remove the selected one
			.filter((split) => split.fingerprint !== selectedSplit.fingerprint);

		return {
			nodeNr,
			split: {
				fingerprint: selectedSplit.fingerprint,
				leftLabels: getCladeLabels(nodeToDraw.left),
				rightLabels: getCladeLabels(nodeToDraw.right),
				localLogDensity: this.getUnnormalizedLocalSplitLogDensity(selectedSplit),
				reason:
					this.conditionedSplits.get(clade.fingerprint) === selectedSplit
						? 'conditionedOn'
						: 'bestSplit'
			},
			heightDistribution: nodeToDraw.heightDistribution,
			alternativeSplits: alternativeSplits.map((split, idx) => ({
				fingerprint: split.fingerprint,
				leftLabels: getLeafNames(this.bccd, split.clade1),
				rightLabels: getLeafNames(this.bccd, split.clade2),
				localLogDensity: split.logDensity,
				isBestSplit: split.isBestSplit
			}))
		};
	}

	getConditionedSplits() {
		const conditionedSplitsInfo = [];

		for (const [cladeFingerprint, split] of this.conditionedSplits.entries()) {
			const nodeNr = this.cladeToNodeNr.get(cladeFingerprint);
			if (!nodeNr) continue;

			conditionedSplitsInfo.push({
				cladeFingerprint,
				splitFingerprint: split.fingerprint,
				nodeNr
			});
		}

		return conditionedSplitsInfo;
	}

	getConditionedHeights() {
		const conditionedHeightsInfo = [];

		for (const [cladeFingerprint, height] of this.conditionedHeights.entries()) {
			const nodeNr = this.cladeToNodeNr.get(cladeFingerprint);
			if (!nodeNr) continue;

			conditionedHeightsInfo.push({
				cladeFingerprint,
				nodeNr,
				height
			});
		}

		return conditionedHeightsInfo;
	}

	/** methods to collect and cache the best subtree densities */

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

			// note that we assume a tree height of 1. This is fine as long as we only use these
			// to rank the splits
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

	/** methods to obtain point estimates and samples */

	private updatePointEstimate() {
		this.pointEstimate = this.buildTree('pointEstimate');
		this.applyHeightConditionsToTree(this.pointEstimate);
		this.sampleHeightDistributions(this.pointEstimate);
	}

	private sampleHeightDistributions(treeToDraw: TreeToDraw) {
		const numSamples = 30_000;

		const heightsPerNode = new Map<number, [number, number][]>();
		for (let i = 0; i < numSamples; i++) {
			const { root } = this.buildTree('sample');

			const rawLogDensity = this.getSubTreeLogDensity(root, root.height);
			const jacobianCorrection = this.applyHeightConditionsToTree({ root });
			const importanceLogDensity = rawLogDensity + jacobianCorrection;
			const importanceLogWeight = importanceLogDensity - rawLogDensity;

			// collect height samples per node nr

			collectHeightsPerNode(root);
			function collectHeightsPerNode(node: NodeToDraw) {
				if (!heightsPerNode.has(node.nr)) heightsPerNode.set(node.nr, []);
				heightsPerNode.get(node.nr)?.push([node.height, Math.exp(importanceLogWeight)]);

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

	private buildTree(samplingMethod: 'pointEstimate' | 'sample'): TreeToDraw {
		let treeHeight;
		if (samplingMethod == 'pointEstimate') {
			treeHeight = logNormalPointEstimate(this.bccd.treeHeightDistribution);
		} else {
			treeHeight = logNormalSample(this.bccd.treeHeightDistribution);
		}

		this.runningNodeNumber = 0;
		const { node: root } = this.buildCladeSubtree(this.bccd.rootClade, treeHeight, samplingMethod);
		const tree = { root };

		return tree;
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
				label: clade.label,
				cladeFingerprint: clade.fingerprint
			};

			if (samplingMethod === 'pointEstimate') {
				this.nodeNrToClade.set(node.nr, clade);
				this.cladeToNodeNr.set(clade.fingerprint, node.nr);
				this.pointEstimateNodes.set(node.nr, node);
			}

			return { node, height };
		}

		// choose split

		const chosenSplit =
			this.conditionedSplits.get(clade.fingerprint) ||
			this.bestSplitsPerClade.get(clade.fingerprint);
		if (chosenSplit === undefined) {
			throw new Error('No best split for clade found. This should not happen.');
		}

		// build children

		const { node: child1, height: childHeight1 } = this.buildCladeSubtree(
			chosenSplit.clade1,
			treeHeight,
			samplingMethod
		);
		const { node: child2, height: childHeight2 } = this.buildCladeSubtree(
			chosenSplit.clade2,
			treeHeight,
			samplingMethod
		);

		// get height

		let height;

		if (isRoot(clade)) {
			height = treeHeight;
		} else {
			const betaParameters = this.bccd.splitRatioDistributions.get(chosenSplit.fingerprint);
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
			heightDistribution: [],
			cladeFingerprint: clade.fingerprint,
			splitFingerprint: chosenSplit.fingerprint
		};

		if (samplingMethod === 'pointEstimate') {
			this.nodeNrToClade.set(node.nr, clade);
			this.cladeToNodeNr.set(clade.fingerprint, node.nr);
			this.pointEstimateNodes.set(node.nr, node);
		}

		return { node, height };
	}

	private applyHeightConditionsToTree(tree: TreeToDraw) {
		return this.applyHeightConditionsToSubtree(tree.root).logJacobianCorrection;
	}

	private applyHeightConditionsToSubtree(
		node: NodeToDraw,
		previousCondition?: {
			sampledHeight: number;
			conditionedHeight: number;
		}
	): {
		nextCondition: {
			sampledHeight: number;
			conditionedHeight: number;
		};
		logJacobianCorrection: number;
	} {
		if (node.type === 'leaf') {
			return {
				nextCondition: {
					sampledHeight: 0,
					conditionedHeight: 0
				},
				logJacobianCorrection: 0
			};
		}

		const conditionedHeight = this.conditionedHeights.get(node.cladeFingerprint);
		if (conditionedHeight !== undefined) {
			previousCondition = {
				sampledHeight: node.height,
				conditionedHeight
			};
		}

		const { nextCondition: leftNextCondition, logJacobianCorrection: leftLogJacobianCorrection } =
			this.applyHeightConditionsToSubtree(node.left, previousCondition);
		const { nextCondition: rightNextCondition, logJacobianCorrection: rightLogJacobianCorrection } =
			this.applyHeightConditionsToSubtree(node.right, previousCondition);

		let nextCondition;
		if (rightNextCondition.conditionedHeight < leftNextCondition.conditionedHeight) {
			nextCondition = leftNextCondition;
		} else {
			nextCondition = rightNextCondition;
		}

		let localJacobianCorrection = 0;

		if (conditionedHeight !== undefined) {
			node.height = conditionedHeight;
			nextCondition = previousCondition;
		} else if (!!previousCondition) {
			const scale =
				(previousCondition.conditionedHeight - nextCondition.conditionedHeight) /
				(previousCondition.sampledHeight - nextCondition.sampledHeight);

			node.height =
				nextCondition.conditionedHeight + (node.height - nextCondition.sampledHeight) * scale;
			localJacobianCorrection = -Math.log(scale);
		} else {
			node.height = nextCondition.conditionedHeight + (node.height - nextCondition.sampledHeight);
		}

		return {
			nextCondition,
			logJacobianCorrection:
				localJacobianCorrection + leftLogJacobianCorrection + rightLogJacobianCorrection
		};
	}

	/** methods to compute the density */

	private getSubTreeLogDensity(node: NodeToDraw, treeHeight: number): number {
		if (node.type === 'leaf') return 0.0;

		const split = this.bccd.splits.get(node.splitFingerprint);
		if (!split) {
			throw new Error('Tried to get density for unknown split. This should not happen.');
		}

		// get local density

		const olderChildHeight = Math.max(node.left.height, node.right.height);

		const unnormalizedLocalSplitLogDensity = this.getUnnormalizedLocalSplitLogDensity(split);
		const jacobianCorrection = this.getLogJacobianCorrection(split, treeHeight, olderChildHeight);

		// get child subtree densities

		const leftDensity = this.getSubTreeLogDensity(node.left, treeHeight);
		const rightDensity = this.getSubTreeLogDensity(node.right, treeHeight);

		return unnormalizedLocalSplitLogDensity + jacobianCorrection + leftDensity + rightDensity;
	}

	private getUnnormalizedLocalSplitLogDensity(split: CladeSplit) {
		const localCCDLogDensity =
			Math.log(this.bccd.numSplitOccurrences.get(split.fingerprint) || 0) -
			Math.log(this.bccd.numCladeOccurrences.get(split.parent.fingerprint) || 0);

		if (isRoot(split.parent)) {
			// this is the root, we look at the tree height distribution

			const logNormalParameters = this.bccd.treeHeightDistribution;

			if (logNormalParameters === undefined) {
				throw new Error('No tree height parameters encountered. This should not happen.');
			}

			const treeHeightPointEstimate = logNormalPointEstimate(logNormalParameters);
			const pointEstimateLogDensity = logNormalLogDensity(
				treeHeightPointEstimate,
				logNormalParameters
			);

			return localCCDLogDensity + pointEstimateLogDensity;
		} else {
			// this is not the root, we look at the ratio distribution

			const betaParameters = this.bccd.splitRatioDistributions.get(split.fingerprint);

			if (betaParameters === undefined) {
				throw new Error('Split with no estimated parameters encountered. This should not happen.');
			}

			const ratioPointEstimate = betaPointEstimate(betaParameters);
			const pointEstimateLogDensity = betaLogDensity(ratioPointEstimate, betaParameters);

			// note that for the proper normalized density, we would have to add the Jacobian
			// correction factor (because ultimately we look ath the density of the height and
			// not the ratio)
			// However, this correction factor is the same for all splits of a clade so we omit it
			// here.

			return localCCDLogDensity + pointEstimateLogDensity;
		}
	}

	private getLogJacobianCorrection(
		split: CladeSplit,
		treeHeight: number,
		olderChildHeight: number
	) {
		if (isRoot(split.parent)) {
			// this is the root, there is no correction factor as we directly model the root height
			return 0.0;
		} else {
			// this is not the root, we return the log of the abs determinant of the Jacobian
			return -Math.log(treeHeight - olderChildHeight);
		}
	}
}
