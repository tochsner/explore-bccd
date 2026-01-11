export type TreeToDraw = {
	root: NodeToDraw;
};

export type InternalNodeToDraw = {
	type: 'internal';
	nr: number;
	height: number;
	left: NodeToDraw;
	right: NodeToDraw;
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
