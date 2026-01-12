import type { Node, Tree } from 'phylojs';
import { getAllNodeLabels, getNodeHeight, getNodeLabel, getTreeHeight } from './treeUtils';
import { isRoot, union, type Clade, type Leaf } from './clade';
import { buildCladeSplit, type CladeSplit } from './cladeSplit';
import { logNormalMLE, type LogNormalParameters } from './logNormalDistribution';
import { betaMLE, type BetaParameters } from './betaDistribution';

export class BCCD {
	numTaxa: number;
	numTrees: number;

	tipNames: string[];
	leafFingerprints: Map<string, number>;

	rootClade!: Clade;
	clades: Map<number, Clade>;
	splits: Map<number, CladeSplit>;
	splitsPerClade: Map<number, Set<number>>;

	numCladeOccurrences: Map<number, number>;
	numSplitOccurrences: Map<number, number>;

	observedTreeHeights: number[];
	observedSplitRatios: Map<number, number[]>;

	treeHeightDistribution!: LogNormalParameters;
	splitRatioDistributions!: Map<number, BetaParameters>;
	globalSplitRatioDistribution!: BetaParameters;

	constructor(trees: Tree[]) {
		if (trees.length === 0) {
			throw new Error('No trees no construct the BCCD for.');
		}

		this.tipNames = getAllNodeLabels(trees[0]);
		this.numTaxa = this.tipNames.length;
		this.numTrees = trees.length;

		this.clades = new Map();
		this.numCladeOccurrences = new Map();

		this.splits = new Map();
		this.numSplitOccurrences = new Map();
		this.splitsPerClade = new Map();

		this.observedTreeHeights = [];
		this.observedSplitRatios = new Map();

		// create random tip fingerprints

		this.leafFingerprints = new Map(
			this.tipNames.map((name) => [name, Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)])
		);

		// iterate over trees and build up clades and clade splits

		for (const tree of trees) {
			this.rootClade = this.cladifyTree(tree, tree.root);
		}

		// fit the branch embedding distribution
		this.fitHeightShorterBranchModel();
	}

	cladifyTree(tree: Tree, node: Node): Clade {
		if (node.isLeaf()) {
			const label = getNodeLabel(node);
			const fingerprint = this.leafFingerprints.get(label);

			if (fingerprint === undefined) {
				throw new Error(`Unknown leaf label ${label}.`);
			}

			const clade: Leaf = {
				fingerprint,
				label,
				size: 1,
				totalNumTips: this.numTaxa
			};
			this.observeClade(clade);

			return clade;
		}

		if (node.children.length != 2) {
			throw new Error(
				`Node with ${node.children.length} children found. Only nodes with none or two children are supported.`
			);
		}

		const leftClade = this.cladifyTree(tree, node.children[0]);
		const rightClade = this.cladifyTree(tree, node.children[1]);

		const clade = union(leftClade, rightClade);
		this.observeClade(clade);

		const cladeSplit = buildCladeSplit(clade, leftClade, rightClade);
		this.observeCladeSplit(cladeSplit, node, tree);

		return clade;
	}

	observeClade(clade: Clade) {
		const existingClade = this.clades.get(clade.fingerprint);
		if (existingClade) {
			// ensure everything is correct and this is the same clade
			if (clade.size !== this.clades.get(clade.fingerprint)?.size) {
				console.error(clade, existingClade);
				throw new Error(
					`Duplicate clades with the same fingerprint found. This should not happen.`
				);
			}
		} else {
			this.clades.set(clade.fingerprint, clade);
		}

		const numOccurrences = this.numCladeOccurrences.get(clade.fingerprint) || 0;
		this.numCladeOccurrences.set(clade.fingerprint, numOccurrences + 1);
	}

	observeCladeSplit(cladeSplit: CladeSplit, node: Node, tree: Tree) {
		// add split

		const existingCladeSplit = this.splits?.get(cladeSplit.fingerprint);
		if (existingCladeSplit) {
			// ensure this is the same clade split by parent fingerprint and children
			if (
				cladeSplit.parent.fingerprint !== existingCladeSplit.parent.fingerprint ||
				cladeSplit.clade1.fingerprint !== existingCladeSplit.clade1.fingerprint ||
				cladeSplit.clade2.fingerprint !== existingCladeSplit.clade2.fingerprint
			) {
				console.error(cladeSplit, existingCladeSplit);
				throw new Error(
					`Duplicate clade splits with the same fingerprint found. This should not happen.`
				);
			}
		} else {
			this.splits.set(cladeSplit.fingerprint, cladeSplit);
		}

		if (!this.splitsPerClade.has(cladeSplit.parent.fingerprint)) {
			this.splitsPerClade.set(cladeSplit.parent.fingerprint, new Set());
		}
		this.splitsPerClade.get(cladeSplit.parent.fingerprint)?.add(cladeSplit.fingerprint);

		// increase number of occurrences

		const numOccurrences = this.numSplitOccurrences.get(cladeSplit.fingerprint) || 0;
		this.numSplitOccurrences.set(cladeSplit.fingerprint, numOccurrences + 1);

		// update branch embedding information

		if (isRoot(cladeSplit.parent)) {
			const treeHeight = getTreeHeight(tree);
			this.observedTreeHeights.push(treeHeight);
		} else {
			const treeHeight = getTreeHeight(tree);
			const nodeHeight = getNodeHeight(node, tree);
			const olderChildHeight = Math.max(
				...node.children.map((child) => getNodeHeight(child, tree))
			);

			const ratio = (nodeHeight - olderChildHeight) / (treeHeight - olderChildHeight);

			if (!this.observedSplitRatios.has(cladeSplit.fingerprint)) {
				this.observedSplitRatios.set(cladeSplit.fingerprint, []);
			}
			this.observedSplitRatios.get(cladeSplit.fingerprint)?.push(ratio);
		}
	}

	fitHeightShorterBranchModel() {
		// fit height model

		this.treeHeightDistribution = logNormalMLE(this.observedTreeHeights);

		// fit global ratio model

		const allRatios = this.observedSplitRatios
			.values()
			.flatMap((x) => x)
			.toArray();

		this.globalSplitRatioDistribution = betaMLE(allRatios);

		// fit ratio models

		this.splitRatioDistributions = new Map();

		for (const [fingerprint, split] of this.splits) {
			if (isRoot(split.parent)) continue;

			const observedRatios = this.observedSplitRatios.get(fingerprint) || [];

			if (observedRatios.length < 5) {
				this.splitRatioDistributions.set(fingerprint, this.globalSplitRatioDistribution);
			} else {
				const betaParameters = betaMLE(observedRatios);
				this.splitRatioDistributions.set(fingerprint, betaParameters);
			}
		}
	}
}
