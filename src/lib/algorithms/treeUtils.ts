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

export function translateLabels(trees: Tree[], nexus: string) {
	// get translation map

	const tmap: Record<string, string> = {};

	const lines = nexus.split(';');
	for (let i = 0; i < lines.length; i++) {
		let fullLine = lines[i].trim();
		// Remove comments
		fullLine = fullLine.replace(/\[[^&][^\]]*\]/g, '').trim();
		// Parse translate line
		if (fullLine.toLowerCase().startsWith('translate')) {
			const tStringArray = fullLine.slice(9, fullLine.length - 1).split(',');
			for (let j = 0; j < tStringArray.length; j++) {
				const tvec = tStringArray[j].trim().split(/\s+/);
				const tkey = tvec[0];
				let tval = tvec.slice(1).join(' ');
				tval = tval.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
				tmap[tkey] = tval;
			}
			break;
		}
	}

	// apply translation

	trees.forEach((tree) => {
		tree.applyPostOrder((node) => {
			if (node.isLeaf()) node.label = tmap[node.label || ''] || node.label;
		});
	});
}
