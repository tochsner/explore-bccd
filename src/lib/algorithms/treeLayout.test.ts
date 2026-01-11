import { expect, test, describe } from 'vitest';
import type { TreeToDraw } from './treeToDraw';
import { TreeLayout } from './treeLayout';

function createTreeToDraw(): TreeToDraw {
	return {
		root: {
			type: 'internal',
			nr: 0,
			height: 3,
			left: {
				type: 'internal',
				nr: 1,
				height: 2,
				left: {
					type: 'leaf',
					nr: 2,
					height: 1,
					label: 'A'
				},
				right: {
					type: 'internal',
					nr: 3,
					height: 1,
					left: {
						type: 'leaf',
						nr: 4,
						height: 0,
						label: 'B'
					},
					right: {
						type: 'leaf',
						nr: 5,
						height: 0,
						label: 'C'
					}
				}
			},
			right: {
				type: 'internal',
				nr: 6,
				height: 2,
				left: {
					type: 'internal',
					nr: 7,
					height: 1,
					left: {
						type: 'leaf',
						nr: 8,
						height: 0,
						label: 'D'
					},
					right: {
						type: 'leaf',
						nr: 9,
						height: 0,
						label: 'E'
					}
				},
				right: {
					type: 'internal',
					nr: 10,
					height: 1,
					left: {
						type: 'leaf',
						nr: 11,
						height: 0,
						label: 'F'
					},
					right: {
						type: 'leaf',
						nr: 12,
						height: 0,
						label: 'G'
					}
				}
			}
		}
	};
}

describe('TreeLayout', () => {
	describe('getXCoordinates', () => {
		test('normalizes X coordinates to 0-1 range based on height', () => {
			const tree = createTreeToDraw();
			const layout = new TreeLayout(tree);
			const xCoords = layout.getXCoordinates();

			// all coordinates should be in 0-1 range
			for (const x of xCoords.values()) {
				expect(x).toBeGreaterThanOrEqual(0);
				expect(x).toBeLessThanOrEqual(1);
			}

			// root at height 3 should be at x=0
			expect(xCoords.get(0)).toBe(0);

			// leaves at height 0 should be at x=1
			expect(xCoords.get(4)).toBe(1); // B
			expect(xCoords.get(5)).toBe(1); // C
		});
	});

	describe('getYCoordinates', () => {
		test('returns normalized Y coordinates in 0-1 range', () => {
			const tree = createTreeToDraw();
			const layout = new TreeLayout(tree);
			const yCoords = layout.getYCoordinates();

			// all coordinates should be in 0-1 range
			for (const y of yCoords.values()) {
				expect(y).toBeGreaterThanOrEqual(0);
				expect(y).toBeLessThanOrEqual(1);
			}
		});

		test('ensures leaf nodes do not overlap', () => {
			const tree = createTreeToDraw();
			const layout = new TreeLayout(tree);
			const yCoords = layout.getYCoordinates();

			// get all leaf Y coordinates
			const leafYs = [
				yCoords.get(2)!, // A
				yCoords.get(4)!, // B
				yCoords.get(5)!, // C
				yCoords.get(8)!, // D
				yCoords.get(9)!, // E
				yCoords.get(11)!, // F
				yCoords.get(12)! // G
			];

			// check that all leaf Y coordinates are unique (no overlaps)
			const uniqueYs = new Set(leafYs);
			expect(uniqueYs.size).toBe(leafYs.length);

			// sort and check minimum spacing
			const sortedYs = [...leafYs].sort((a, b) => a - b);
			for (let i = 1; i < sortedYs.length; i++) {
				// there should be some spacing between leaves
				expect(sortedYs[i]).toBeGreaterThan(sortedYs[i - 1]);
			}
		});

		test('centers parent nodes between their children', () => {
			const tree = createTreeToDraw();
			const layout = new TreeLayout(tree);
			const yCoords = layout.getYCoordinates();

			// check node 3 (parent of B and C)
			const node3Y = yCoords.get(3)!;
			const nodeBY = yCoords.get(4)!;
			const nodeCY = yCoords.get(5)!;

			// parent should be between children
			expect(node3Y).toBeGreaterThanOrEqual(Math.min(nodeBY, nodeCY));
			expect(node3Y).toBeLessThanOrEqual(Math.max(nodeBY, nodeCY));

			// check node 7 (parent of D and E)
			const node7Y = yCoords.get(7)!;
			const nodeDY = yCoords.get(8)!;
			const nodeEY = yCoords.get(9)!;

			expect(node7Y).toBeGreaterThanOrEqual(Math.min(nodeDY, nodeEY));
			expect(node7Y).toBeLessThanOrEqual(Math.max(nodeDY, nodeEY));
		});

		test('handles single leaf tree', () => {
			const singleLeaf: TreeToDraw = {
				root: {
					type: 'leaf',
					nr: 0,
					height: 0,
					label: 'A'
				}
			};

			const layout = new TreeLayout(singleLeaf);
			const yCoords = layout.getYCoordinates();

			// single leaf should be at y=0 (normalized)
			expect(yCoords.get(0)).toBe(0);
		});

		test('handles perfectly balanced tree', () => {
			const balancedTree: TreeToDraw = {
				root: {
					type: 'internal',
					nr: 0,
					height: 1,
					left: {
						type: 'leaf',
						nr: 1,
						height: 0,
						label: 'A'
					},
					right: {
						type: 'leaf',
						nr: 2,
						height: 0,
						label: 'B'
					}
				}
			};

			const layout = new TreeLayout(balancedTree);
			const yCoords = layout.getYCoordinates();

			// both leaves should be spaced apart
			const leafAY = yCoords.get(1)!;
			const leafBY = yCoords.get(2)!;

			expect(leafAY).not.toBe(leafBY);

			// parent should be centered
			const rootY = yCoords.get(0)!;
			expect(rootY).toBeCloseTo((leafAY + leafBY) / 2, 5);
		});

		test('respects non-layered structure with different heights', () => {
			const tree = createTreeToDraw();
			const layout = new TreeLayout(tree);
			const yCoords = layout.getYCoordinates();

			// verify all nodes have Y coordinates assigned
			expect(yCoords.size).toBe(13);

			// verify coordinates exist for nodes at different heights
			expect(yCoords.has(0)).toBe(true); // root at height 3
			expect(yCoords.has(2)).toBe(true); // leaf A at height 1
			expect(yCoords.has(4)).toBe(true); // leaf B at height 0
		});
	});
});
