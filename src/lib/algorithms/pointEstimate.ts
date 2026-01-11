import { Tree, Node } from 'phylojs';
import type { BCCD } from './bccd';
import { isLeaf, isRoot, type Clade } from './clade';
import { logNormalPointEstimate } from './logNormalDistribution';
import type { CladeSplit } from './cladeSplit';
import { betaLogDensity, betaPointEstimate } from './betaDistribution';

export class BCCDPointEstimator {
	bccd: BCCD;

	splitSubtreeLogDensities: Map<number, number>;

	cladeSubtreeHeights: Map<number, number>;
	splitSubtreeHeights: Map<number, number>;

	bestSplitsPerClade: Map<number, CladeSplit>;

	runningNodeNumber: number;

	constructor(bccd: BCCD) {
		this.bccd = bccd;
		this.splitSubtreeLogDensities = new Map();
		this.cladeSubtreeHeights = new Map();
		this.splitSubtreeHeights = new Map();
		this.bestSplitsPerClade = new Map();
		this.runningNodeNumber = 0;

		this.collectCladeSubtreeLogDensities(bccd.rootClade);
		this.cladeSubtreeHeights.set(this.bccd.rootClade.fingerprint, 1.0);
	}

	collectCladeSubtreeLogDensities(clade: Clade) {
		if (isLeaf(clade)) {
			this.cladeSubtreeHeights.set(clade.fingerprint, 0.0);
			return 0;
		}

		let bestSplitLogDensity = Number.NEGATIVE_INFINITY;
		let bestSplit: CladeSplit | null = null;

		const possibleSplits = this.bccd.splitsPerClade.get(clade.fingerprint);

		for (const split of possibleSplits || []) {
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

	collectSplitSubtreeLogDensities(split: CladeSplit) {
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

	buildPointEstimate(): Tree {
		const treeHeight = logNormalPointEstimate(this.bccd.treeHeightDistribution);

		this.runningNodeNumber = 0;
		const root = this.buildCladeSubtree(this.bccd.rootClade, treeHeight);
		root.branchLength = 0.0;

		return new Tree(root);
	}

	buildCladeSubtree(clade: Clade, treeHeight: number): Node {
		if (isLeaf(clade)) {
			const leaf = new Node(this.runningNodeNumber++);
			leaf.label = clade.label;
			leaf.height = treeHeight;
			return leaf;
		}

		// find best split

		const bestSplit = this.bestSplitsPerClade.get(clade.fingerprint);
		if (bestSplit === undefined) {
			throw new Error('No best split for clade found. This should not happen.');
		}

		// start creating node by adding children

		const node = new Node(this.runningNodeNumber++);
		const child1 = this.buildCladeSubtree(bestSplit.clade1, treeHeight);
		const child2 = this.buildCladeSubtree(bestSplit.clade2, treeHeight);

		node.addChild(child1);
		node.addChild(child2);

		// set heights

		const nodeHeight = this.cladeSubtreeHeights.get(clade.fingerprint);
		const child1Height = this.cladeSubtreeHeights.get(bestSplit.clade1.fingerprint);
		const child2Height = this.cladeSubtreeHeights.get(bestSplit.clade2.fingerprint);

		if (nodeHeight === undefined || child1Height === undefined || child2Height === undefined) {
			throw new Error('No best heights found for clades. This should not happen.');
		}

		// phylojs assigns heights forward in time, we otherwise use heights backwards in time
		node.height = treeHeight * (treeHeight - nodeHeight);
		child1.height = treeHeight * (treeHeight - child1Height);
		child2.height = treeHeight * (treeHeight - child2Height);

		child1.branchLength = treeHeight * (nodeHeight - child1Height);
		child2.branchLength = treeHeight * (nodeHeight - child2Height);

		return node;
	}
}
