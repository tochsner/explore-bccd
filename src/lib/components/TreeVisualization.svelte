<script lang="ts">
	import { TreeLayout } from '$lib/algorithms/treeLayout';
	import {
		getLeafLabels,
		getTreeHeight,
		type NodeToDraw,
		type TreeToDraw
	} from '$lib/algorithms/treeToDraw';
	import { formatNumber } from '$lib/utils/formatter';
	import { Canvas, Layer, type Render } from 'svelte-canvas';

	let {
		treeToDraw,
		selectedNode = $bindable()
	}: {
		treeToDraw: TreeToDraw;
		selectedNode?: NodeToDraw;
	} = $props();

	let height = $state<number>();
	let width = $state<number>();

	let hoveredNode = $state<NodeToDraw | undefined>();

	const margin = 40;

	let minHeight = $derived.by(() => {
		const leafLabels = getLeafLabels(treeToDraw);
		const minLeafGap = 15;
		return Math.max(2 * margin + minLeafGap * (leafLabels.length - 1), height || 0.0);
	});

	const treeLayout = $derived(new TreeLayout(treeToDraw));
	const xCoordinates = $derived(treeLayout.getXCoordinates());
	const yCoordinates = $derived(treeLayout.getYCoordinates());

	let renderedNodeCoordinates = $state<{ node: NodeToDraw; x: number; y: number }[]>([]);

	const accentColor = getComputedStyle(document.body).getPropertyValue('--color-accent');

	const renderTree: Render = ({ context, width, height }) => {
		const maxLabelWidth = getMaxLabelWidth(context);
		const treeWidth = width - 2 * margin - maxLabelWidth;
		const treeHeight = height - 2 * margin;

		const localRenderedNodeCoordinates: { node: NodeToDraw; x: number; y: number }[] = [];

		const root = treeToDraw.root;
		if (root.type === 'leaf') return;

		renderTip();
		renderNode(root, root);
		renderNode(root.left, root);
		renderNode(root.right, root);

		function renderTip() {
			context.font = `italic 15px sans-serif`;
			context.textAlign = 'left';
			context.textBaseline = 'middle';
			context.fillStyle = 'rgb(50, 50, 50)';
			context.fillText('Select a node to see more details.', 15, 15);
		}

		function renderNode(child: NodeToDraw, parent: NodeToDraw) {
			// renders the branch from parent leading up to child

			const parentX = treeWidth * (xCoordinates.get(parent.nr) || 0.0) + margin;
			const parentY = treeHeight * (yCoordinates.get(parent.nr) || 0.0) + margin;
			const childX = treeWidth * (xCoordinates.get(child.nr) || 0.0) + margin;
			const childY = treeHeight * (yCoordinates.get(child.nr) || 0.0) + margin;

			localRenderedNodeCoordinates.push({ node: child, x: childX, y: childY });

			// render branch

			context.fillStyle = 'black';
			context.strokeStyle = 'black';
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
				// render subtree

				// render dot
				if (selectedNode === child || hoveredNode === child) {
					context.beginPath();
					context.arc(childX, childY, 4, 0, Math.PI * 2);
					context.fillStyle = 'black';
					context.fill();
				} else {
					context.beginPath();
					context.arc(childX, childY, 2, 0, Math.PI * 2);
					context.fillStyle = 'black';
					context.fill();
				}

				renderNode(child.left, child);
				renderNode(child.right, child);
			}
		}

		renderedNodeCoordinates = localRenderedNodeCoordinates;
	};

	const renderTimeAxis: Render = ({ context, width, height }) => {
		const treeTimeHeight = getTreeHeight(treeToDraw);

		const maxLabelWidth = getMaxLabelWidth(context);
		const treeWidth = width - 2 * margin - maxLabelWidth;

		const root = treeToDraw.root;
		if (root.type === 'leaf') return;

		const tickHeight = 10;

		context.strokeStyle = 'lightgray';

		// render line

		context.beginPath();
		context.moveTo(0, height - tickHeight / 2);
		context.lineTo(treeWidth + margin + 10, height - tickHeight / 2);
		context.stroke();

		// render ticks

		const tickTimeGap = Math.min(
			Math.pow(10, Math.floor(Math.log10(treeTimeHeight))),
			treeTimeHeight / 4
		);
		const tickPixelGap = (tickTimeGap * width) / treeTimeHeight;
		const numTicks = Math.floor(treeTimeHeight / tickTimeGap);

		[...Array(numTicks).keys()].forEach((tick) => {
			const tickX = margin + treeWidth - tick * tickPixelGap;
			const tickTime = tick * tickTimeGap;

			// render tick line
			context.beginPath();
			context.moveTo(tickX, height);
			context.lineTo(tickX, height - tickHeight);
			context.stroke();

			// render tick label
			context.font = `12px sans-serif`;
			context.textAlign = 'center';
			context.textBaseline = 'middle';
			context.fillStyle = 'lightgray';
			context.fillText(formatNumber(tickTime), tickX, height - tickHeight - 10);
		});

		// render hovered tick

		const activeNode = hoveredNode || selectedNode;
		if (activeNode) {
			const tickX = margin + treeWidth * (1 - activeNode.height / treeTimeHeight);

			// render tick line
			context.strokeStyle = accentColor;
			context.beginPath();
			context.moveTo(tickX, height);
			context.lineTo(tickX, height - tickHeight);
			context.stroke();

			// render tick label
			context.font = `12px sans-serif`;
			context.textAlign = 'center';
			context.textBaseline = 'middle';
			context.fillStyle = accentColor;
			context.fillText(formatNumber(activeNode.height), tickX, height - tickHeight - 10);
		}
	};

	const renderDistributions: Render = ({ context, width, height }) => {
		const treeLayout = new TreeLayout(treeToDraw);
		const treeTimeHeight = getTreeHeight(treeToDraw);

		const maxLabelWidth = getMaxLabelWidth(context);
		const treeWidth = width - 2 * margin - maxLabelWidth;
		const treeHeight = height - 2 * margin;

		const root = treeToDraw.root;
		if (root.type === 'leaf') return;

		renderNode(root, root);
		renderNode(root.left, root);
		renderNode(root.right, root);

		function renderNode(child: NodeToDraw, parent: NodeToDraw) {
			if (child.type === 'leaf') return;

			const childX = treeWidth * (xCoordinates.get(child.nr) || 0.0) + margin;
			const childY = treeHeight * (yCoordinates.get(child.nr) || 0.0) + margin;

			const histogramHeight = 70;

			const histogramStartX =
				(treeWidth * (treeTimeHeight - (child.heightDistribution.at(0)?.bucketStart || 0.0))) /
					treeTimeHeight +
				margin;
			const histogramEndX =
				(treeWidth *
					(treeTimeHeight -
						(child.heightDistribution.at(child.heightDistribution.length - 1)?.bucketEnd || 0.0))) /
					treeTimeHeight +
				margin;

			const bucketWidth = (histogramEndX - histogramStartX) / child.heightDistribution.length;

			if (selectedNode === child) {
				context.fillStyle = accentColor;
			} else {
				context.fillStyle = 'rgba(100, 100, 100, 0.2)';
			}
			context.beginPath();
			context.moveTo(histogramStartX, childY);
			context.lineTo(
				histogramStartX,
				childY - histogramHeight * child.heightDistribution[0].normalizedDensity
			);

			child.heightDistribution.forEach((bucket, index) => {
				context.lineTo(
					histogramStartX + (index + 1) * bucketWidth,
					childY - histogramHeight * bucket.normalizedDensity
				);
			});

			context.lineTo(
				histogramStartX,
				childY -
					histogramHeight *
						child.heightDistribution[child.heightDistribution.length - 1].normalizedDensity
			);
			context.fill();

			// render subtree

			renderNode(child.left, child);
			renderNode(child.right, child);
		}
	};

	function getMaxLabelWidth(context: CanvasRenderingContext2D) {
		context.font = `15px sans-serif`;
		context.textAlign = 'left';
		context.textBaseline = 'middle';
		context.fillStyle = 'black';

		return Math.max(...getLeafLabels(treeToDraw).map((label) => context.measureText(label).width));
	}

	function onclick(event: Event) {
		selectedNode = getClosestNode(event as MouseEvent);
	}

	function onmousemove(event: Event) {
		hoveredNode = getClosestNode(event as MouseEvent);
	}

	function getClosestNode(event: MouseEvent) {
		const canvas = event.currentTarget as Canvas | null;
		if (canvas === null) return undefined;

		// translate mouse location to canvas coordinates

		const rect: DOMRect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.x;
		const y = event.clientY - rect.y;

		// find node closest to click location

		const distanceThreshold = 10;

		return renderedNodeCoordinates
			.map((c) => ({
				node: c.node,
				distance: (x - c.x) ** 2 + (y - c.y) ** 2
			}))
			.sort((a, b) => a.distance - b.distance)
			.filter((c) => c.distance < distanceThreshold ** 2)
			.at(0)?.node;
	}
</script>

<div class="h-full min-h-0 flex-1 p-4">
	<div
		class="h-full w-full"
		bind:clientHeight={height}
		bind:clientWidth={width}
		class:cursor-pointer={!!hoveredNode}
	>
		{#if height && width && minHeight}
			<Canvas height={minHeight} {width} {onclick} {onmousemove}>
				<Layer render={renderTree} />
				<Layer render={renderDistributions} />
				<Layer render={renderTimeAxis} />
				<Layer render={renderTimeAxis} />
			</Canvas>
		{/if}
	</div>
</div>
