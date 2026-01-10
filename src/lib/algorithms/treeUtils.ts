import type { Node, Tree } from "phylojs";

export function getNodeLabel(node: Node): string {
    return node.label || node.id.toString()
}

export function getAllNodeLabels(tree: Tree): string[] {
    const labels: string[] = [];
    tree.applyPostOrder(node => { if (node.isLeaf()) labels.push(getNodeLabel(node)); });
    return labels;
}