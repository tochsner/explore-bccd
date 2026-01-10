import type { Node, Tree } from 'phylojs';
import { getAllNodeLabels, getNodeLabel } from './treeUtils';
import { union, type Clade, type Leaf } from './clade';
import { buildCladeSplit, type CladeSplit } from './cladeSplit';

export class BCCD {
	numTaxa: number;
	numTrees: number;

	tipNames: string[];
	leafFingerprints: Map<string, number>;

	rootClade!: Clade;
	clades: Map<number, Clade>;
	splits: Map<number, CladeSplit>;
	splitsPerClade: Map<number, Set<CladeSplit>>;

	numCladeOccurrences: Map<number, number>;
	numSplitOccurrences: Map<number, number>;

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

		// create random tip fingerprints

		this.leafFingerprints = new Map(
			this.tipNames.map((name) => [name, Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)])
		);

		// iterate over trees and build up clades and clade splits

		for (const tree of trees) {
			this.rootClade = this.cladifyTree(tree, tree.root);
		}
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
		this.observeCladeSplit(cladeSplit);

		return clade;
	}

	observeClade(clade: Clade) {
		const existingClade = this.clades.get(clade.fingerprint);
		if (existingClade) {
			// ensure everything is correct and this is the same clade
			if (clade.size !== this.clades.get(clade.fingerprint)?.size) {
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

	observeCladeSplit(cladeSplit: {
		fingerprint: number;
		parent: Clade;
		clade1: Clade;
		clade2: Clade;
	}) {
		const existingCladeSplit = this.splits?.get(cladeSplit.fingerprint);
		if (existingCladeSplit) {
			// ensure this is the same clade split by parent fingerprint and children
			if (
				cladeSplit.parent.fingerprint !== existingCladeSplit.parent.fingerprint ||
				cladeSplit.clade1.fingerprint !== existingCladeSplit.clade1.fingerprint ||
				cladeSplit.clade2.fingerprint !== existingCladeSplit.clade2.fingerprint
			) {
				console.log(cladeSplit, existingCladeSplit);
				throw new Error(
					`Duplicate clade splits with the same fingerprint found. This should not happen.`
				);
			}
		} else {
			this.splits.set(cladeSplit.fingerprint, cladeSplit);
		}

		const numOccurrences = this.numSplitOccurrences.get(cladeSplit.fingerprint) || 0;
		this.numSplitOccurrences.set(cladeSplit.fingerprint, numOccurrences + 1);
	}
}
