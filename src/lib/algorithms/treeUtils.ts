import type { Node, Tree } from 'phylojs';

export function getNodeLabel(node: Node): string {
	return node.label || node.id.toString();
}

export function getAllNodeLabels(tree: Tree): string[] {
	const labels: string[] = [];
	tree.applyPostOrder((node) => {
		if (node.isLeaf()) labels.push(getNodeLabel(node));
	});
	return labels;
}

export function getNodeHeight(node: Node, tree: Tree): number {
	if (node.height === undefined) {
		throw new Error('Posterior tree with no height information found.');
	}

	const treeHeight = Math.max.apply(Math, tree.getInternalNodeHeights());
	return treeHeight - node.height;
}

export function getTreeHeight(tree: Tree): number {
	return Math.max.apply(Math, tree.getInternalNodeHeights());
}
