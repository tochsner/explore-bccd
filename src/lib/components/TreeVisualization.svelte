<script lang="ts">
	import { TreeLayout } from '$lib/algorithms/treeLayout';
	import {
		getLeafLabels,
		getTreeHeight,
		type NodeToDraw,
		type TreeToDraw
	} from '$lib/algorithms/treeToDraw';
	import { tick } from 'svelte';
	import { Canvas, Layer, type Render } from 'svelte-canvas';

	let {
		treeToDraw
	}: {
		treeToDraw: TreeToDraw;
	} = $props();

	let height = $state<number>();
	let width = $state<number>();

	const render: Render = ({ context, width, height }) => {
		const treeLayout = new TreeLayout(treeToDraw);
		const treeTimeHeight = getTreeHeight(treeToDraw);
		const xCoordinates = treeLayout.getXCoordinates();
		const yCoordinates = treeLayout.getYCoordinates();

		const margin = 50;
		const maxLabelWidth = getMaxLabelWidth();
		const treeWidth = width - 2 * margin - maxLabelWidth;
		const treeHeight = height - 2 * margin;

		const accentColor = getComputedStyle(document.body).getPropertyValue('--color-accent');

		const root = treeToDraw.root;
		if (root.type === 'leaf') return;

		renderRoot(root);
		renderNode(root.left, root);
		renderNode(root.right, root);
		renderTimeAxis();

		function getMaxLabelWidth() {
			context.font = `15px sans-serif`;
			context.textAlign = 'left';
			context.textBaseline = 'middle';
			context.fillStyle = 'black';

			return Math.max(
				...getLeafLabels(treeToDraw).map((label) => context.measureText(label).width)
			);
			context.measureText('myText').width;
		}

		function renderRoot(root: NodeToDraw) {
			// render a small branch

			const rootBranchLength = 10;

			const rootX = treeWidth * (xCoordinates.get(root.nr) || 0.0) + margin;
			const rootY = treeHeight * (yCoordinates.get(root.nr) || 0.0) + margin;

			context.beginPath();
			context.moveTo(rootX - rootBranchLength, rootY);
			context.lineTo(rootX, rootY);
			context.stroke();

			// render dot

			context.beginPath();
			context.arc(rootX, rootY, 4, 0, Math.PI * 2);
			context.fillStyle = 'black';
			context.fill();
		}

		function renderNode(child: NodeToDraw, parent: NodeToDraw) {
			// renders the branch from parent leading up to child

			const parentX = treeWidth * (xCoordinates.get(parent.nr) || 0.0) + margin;
			const parentY = treeHeight * (yCoordinates.get(parent.nr) || 0.0) + margin;
			const childX = treeWidth * (xCoordinates.get(child.nr) || 0.0) + margin;
			const childY = treeHeight * (yCoordinates.get(child.nr) || 0.0) + margin;

			// render branch

			context.beginPath();
			context.moveTo(parentX, parentY);
			context.lineTo(parentX, childY);
			context.stroke();

			context.beginPath();
			context.moveTo(parentX, childY);
			context.lineTo(childX, childY);
			context.stroke();

			if (child.type === 'leaf') {
				// render dot

				context.beginPath();
				context.arc(childX, childY, 4, 0, Math.PI * 2);
				context.fillStyle = accentColor;
				context.fill();

				// render label

				context.font = `15px sans-serif`;
				context.textAlign = 'left';
				context.textBaseline = 'middle';
				context.fillStyle = 'black';
				context.fillText(child.label, childX + 10, childY);
			} else {
				// render dot

				context.beginPath();
				context.arc(childX, childY, 4, 0, Math.PI * 2);
				context.fillStyle = accentColor;
				context.fill();

				// render height distribution

				const histogramHeight = 5;

				const histogramStartX =
					(treeWidth * (treeTimeHeight - (child.heightDistribution.at(0)?.bucketStart || 0.0))) /
						treeTimeHeight +
					margin;
				const histogramEndX =
					(treeWidth *
						(treeTimeHeight -
							(child.heightDistribution.at(child.heightDistribution.length - 1)?.bucketEnd ||
								0.0))) /
						treeTimeHeight +
					margin;

				const bucketWidth = (histogramEndX - histogramStartX) / child.heightDistribution.length;

				context.beginPath();
				context.moveTo(histogramStartX, childY);

				child.heightDistribution.forEach((bucket, index) => {
					context.lineTo(
						histogramStartX + (index + 1) * bucketWidth,
						childY - histogramHeight * bucket.normalizedDensity
					);
				});

				context.lineTo(histogramEndX, childY);

				context.fill();

				// render subtree

				renderNode(child.left, child);
				renderNode(child.right, child);
			}
		}

		function renderTimeAxis() {
			const tickHeight = 10;

			context.strokeStyle = 'lightgray';

			// render line

			context.beginPath();
			context.moveTo(margin, tickHeight / 2);
			context.lineTo(margin + treeWidth, tickHeight / 2);
			context.stroke();

			// render ticks

			const tickTimeGap = Math.pow(10, Math.floor(Math.log10(treeTimeHeight)));
			const tickPixelGap = (tickTimeGap * width) / treeTimeHeight;
			const numTicks = Math.floor(treeTimeHeight / tickTimeGap) + 1;

			[...Array(numTicks).keys()].forEach((tick) => {
				const tickX = margin + treeWidth - tick * tickPixelGap;
				const tickTime = tick * tickTimeGap;

				// render tick line
				context.beginPath();
				context.moveTo(tickX, 0);
				context.lineTo(tickX, tickHeight);
				context.stroke();

				// render tick label
				context.font = `12px sans-serif`;
				context.textAlign = 'center';
				context.textBaseline = 'middle';
				context.fillStyle = 'lightgray';
				context.fillText(tickTime.toFixed(1), tickX, tickHeight + 10);
			});
		}
	};
</script>

<div class="h-full w-full flex-1" bind:clientHeight={height} bind:clientWidth={width}>
	{#if height && width}
		<Canvas {height} {width}>
			<Layer {render} />
		</Canvas>
	{/if}
</div>
