import { getOlderChild, type NodeToDraw, type TreeToDraw } from './treeToDraw';

export class TreeLayout {
	private treeToDraw: TreeToDraw;
	private treeHeight: number;

	private xCoordinates: Map<number, number>;
	private yCoordinates: Map<number, number>;
	private modifiers: Map<number, number>;

	// fields for Y coordinate calculation (Reingold-Tilford algorithm)
	private preliminaryY: Map<number, number>;
	private minY: number;

	private SIBLING_DISTANCE = 1.0;

	constructor(treeToDraw: TreeToDraw) {
		this.treeToDraw = treeToDraw;
		this.treeHeight = this.treeToDraw.root.height;
		this.modifiers = new Map();
		this.yCoordinates = new Map();
		this.xCoordinates = new Map();
		this.preliminaryY = new Map();
		this.minY = 0.0;
	}

	getXCoordinates(): Map<number, number> {
		this.xCoordinates = new Map();
		this.calculateXCoordinates(this.treeToDraw.root);
		return this.xCoordinates;
	}

	calculateXCoordinates(node: NodeToDraw) {
		this.xCoordinates.set(node.nr, (this.treeHeight - node.height) / this.treeHeight);

		if (node.type === 'internal') {
			this.calculateXCoordinates(node.left);
			this.calculateXCoordinates(node.right);
		}
	}

	getYCoordinates(): Map<number, number> {
		this.yCoordinates = new Map();
		this.preliminaryY = new Map();
		this.modifiers = new Map();
		this.minY = 0;

		this.firstWalk(this.treeToDraw.root);
		this.secondWalk(this.treeToDraw.root, 0);
		this.normalizeYCoordinates();

		return this.yCoordinates;
	}

	// first walk: post-order traversal to assign preliminary Y and modifiers
	private firstWalk(node: NodeToDraw): void {
		// initialize modifier to 0
		this.modifiers.set(node.nr, 0);

		if (node.type === 'leaf') {
			// all leaves start at Y=0, spacing comes from tree structure
			this.preliminaryY.set(node.nr, 0);
		} else {
			// internal node: process children first (post-order)
			this.firstWalk(node.left);
			this.firstWalk(node.right);

			// check for conflicts between subtrees
			const shift = this.checkConflicts(node);

			// apply shift to right subtree if needed
			if (shift > 0) {
				const rightModifier = this.modifiers.get(node.right.nr) || 0;
				this.modifiers.set(node.right.nr, rightModifier + shift);
			}

			// center parent between children
			const centerY = this.centerParent(node.left, node.right);
			this.preliminaryY.set(node.nr, centerY);
		}
	}

	// check for conflicts between left and right subtrees, return shift amount
	private checkConflicts(node: import('./treeToDraw').InternalNodeToDraw): number {
		// get contours with accumulated modifiers
		const leftContour = this.getRightContour(node.left, this.modifiers.get(node.left.nr) || 0);
		const rightContour = this.getLeftContour(node.right, this.modifiers.get(node.right.nr) || 0);

		let maxShift = 0;
		let leftIdx = 0;
		let rightIdx = 0;

		// walk down both contours simultaneously
		// key: advance based on node heights (non-layered aspect)
		while (leftIdx < leftContour.length || rightIdx < rightContour.length) {
			const leftPoint = leftContour[leftIdx];
			const rightPoint = rightContour[rightIdx];

			// check for conflict at current position
			const gap = rightPoint.y - leftPoint.y;
			const requiredShift = this.SIBLING_DISTANCE - gap;
			maxShift = Math.max(maxShift, requiredShift);

			if (leftIdx === leftContour.length - 1 && rightIdx === rightContour.length - 1) {
				// we reached the end of the tree
				break;
			} else if (leftIdx === leftContour.length - 1) {
				// left is a leaf, we only advance right
				rightIdx++;
			} else if (rightIdx === rightContour.length - 1) {
				// right is a leaf, we only advance left
				leftIdx++;
			} else if (leftPoint.height > rightPoint.height) {
				// neither is a leaf, we advance the one closer to us
				leftIdx++;
			} else if (rightPoint.height < leftPoint.height) {
				// neither is a leaf, we advance the one closer to us
				rightIdx++;
			} else {
				// both at same height, advance both
				leftIdx++;
				rightIdx++;
			}
		}

		return Math.max(0, maxShift);
	}

	// get left contour of a subtree (leftmost nodes at each height)
	private getLeftContour(
		node: NodeToDraw,
		modSum: number
	): Array<{ height: number; y: number; nr: number }> {
		const contour: Array<{ height: number; y: number; nr: number }> = [];
		const prelimY = this.preliminaryY.get(node.nr) || 0;

		contour.push({
			height: node.height,
			y: prelimY + modSum,
			nr: node.nr
		});

		if (node.type === 'internal') {
			// follow left spine
			const leftMod = this.modifiers.get(node.left.nr) || 0;
			const leftContour = this.getLeftContour(node.left, modSum + leftMod);
			contour.push(...leftContour);
		}

		return contour;
	}

	// get right contour of a subtree (rightmost nodes at each height)
	private getRightContour(
		node: NodeToDraw,
		modSum: number
	): Array<{ height: number; y: number; nr: number }> {
		const contour: Array<{ height: number; y: number; nr: number }> = [];
		const prelimY = this.preliminaryY.get(node.nr) || 0;

		contour.push({
			height: node.height,
			y: prelimY + modSum,
			nr: node.nr
		});

		if (node.type === 'internal') {
			// follow right spine
			const rightMod = this.modifiers.get(node.right.nr) || 0;
			const rightContour = this.getRightContour(node.right, modSum + rightMod);
			contour.push(...rightContour);
		}

		return contour;
	}

	// helper method: calculate center Y position between two children
	private centerParent(leftChild: NodeToDraw, rightChild: NodeToDraw): number {
		const leftY =
			(this.preliminaryY.get(leftChild.nr) || 0) + (this.modifiers.get(leftChild.nr) || 0);
		const rightY =
			(this.preliminaryY.get(rightChild.nr) || 0) + (this.modifiers.get(rightChild.nr) || 0);
		return (leftY + rightY) / 2;
	}

	// second walk: pre-order traversal to apply accumulated modifiers
	private secondWalk(node: NodeToDraw, modSum: number): void {
		const prelimY = this.preliminaryY.get(node.nr) || 0;
		const modifier = this.modifiers.get(node.nr) || 0;

		// final Y = preliminary Y + node's modifier + accumulated modifiers from ancestors
		const finalY = prelimY + modifier + modSum;
		this.yCoordinates.set(node.nr, finalY);

		// track minimum for later normalization
		this.minY = Math.min(this.minY, finalY);

		if (node.type === 'internal') {
			// propagate accumulated modifiers to children
			this.secondWalk(node.left, modSum + modifier);
			this.secondWalk(node.right, modSum + modifier);
		}
	}

	// normalize Y coordinates to 0-1 range
	private normalizeYCoordinates(): void {
		// shift all coordinates so minimum is 0
		if (this.minY < 0) {
			for (const [nodeNr, y] of this.yCoordinates.entries()) {
				this.yCoordinates.set(nodeNr, y - this.minY);
			}
		}

		// find maximum Y
		let maxY = 0;
		for (const y of this.yCoordinates.values()) {
			maxY = Math.max(maxY, y);
		}

		// scale to 0-1 range
		if (maxY > 0) {
			for (const [nodeNr, y] of this.yCoordinates.entries()) {
				this.yCoordinates.set(nodeNr, y / maxY);
			}
		}
	}
}
