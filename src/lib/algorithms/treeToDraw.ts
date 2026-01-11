import type { Histogram } from './histogram';

export type TreeToDraw = {
	root: NodeToDraw;
};

export type InternalNodeToDraw = {
	type: 'internal';
	nr: number;
	height: number;
	left: NodeToDraw;
	right: NodeToDraw;
	heightDistribution: Histogram;
};

export type LeafToDraw = {
	type: 'leaf';
	nr: number;
	height: number;
	label: string;
};

export type NodeToDraw = InternalNodeToDraw | LeafToDraw;

export function numberOfLeavesToDraw(treeToDraw: TreeToDraw) {
	return numberOfLeavesToDrawInSubtree(treeToDraw.root);
}

function numberOfLeavesToDrawInSubtree(node: NodeToDraw): number {
	if (node.type === 'leaf') {
		return 1;
	} else {
		return numberOfLeavesToDrawInSubtree(node.left) + numberOfLeavesToDrawInSubtree(node.right);
	}
}

export function getOlderChild(node: InternalNodeToDraw) {
	if (node.left.height > node.right.height) {
		return node.left;
	} else {
		return node.right;
	}
}

export function getTreeHeight(tree: TreeToDraw) {
	return tree.root.height;
}

export function getLeafLabels(tree: TreeToDraw) {
	const leafLabels: string[] = [];
	collectLeafLabels(tree.root, leafLabels);
	return leafLabels;
}

function collectLeafLabels(node: NodeToDraw, leafLabels: string[]) {
	if (node.type === 'leaf') {
		leafLabels.push(node.label);
	} else {
		collectLeafLabels(node.left, leafLabels);
		collectLeafLabels(node.right, leafLabels);
	}
}
