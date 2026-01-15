<script lang="ts">
	import { TreeLayout } from '$lib/algorithms/treeLayout';
	import { getLeafLabels, getTreeHeight, type NodeToDraw } from '$lib/algorithms/treeToDraw';
	import type { GlobalState } from '$lib/context/globalContext.svelte';
	import { formatNumber } from '$lib/utils/formatter';
	import { Canvas, Layer, type Render } from 'svelte-canvas';
	import C2SVG from 'canvas2svg';

	let {
		globalState,
		worker,
		exportSVG = $bindable()
	}: {
		globalState: GlobalState;
		worker: Worker;
		exportSVG: () => void;
	} = $props();

	const { pointEstimate, selectedNodeDetails, hoveredNodeNr } = $derived(
		globalState.getGlobalState()
	);

	let height = $state<number>();
	let width = $state<number>();

	let selectedNode = $state<NodeToDraw | undefined>();
	let hoveredNode = $state<NodeToDraw | undefined>();

	const margin = 40;

	let minHeight = $derived.by(() => {
		if (!pointEstimate) return 0.0;
		const leafLabels = getLeafLabels(pointEstimate);
		const minLeafGap = 15;
		return Math.max(2 * margin + minLeafGap * (leafLabels.length - 1), height || 0.0);
	});

	const treeLayout = $derived(pointEstimate ? new TreeLayout(pointEstimate) : undefined);
	const xCoordinates = $derived(treeLayout?.getXCoordinates() || new Map());
	const yCoordinates = $derived(treeLayout?.getYCoordinates() || new Map());

	let renderedNodeCoordinates = $state<{ node: NodeToDraw; x: number; y: number }[]>([]);

	const accentColor = getComputedStyle(document.body).getPropertyValue('--color-accent');

	const renderHints: Render = ({ context, width, height }) => {
		context.font = `italic 15px sans-serif`;
		context.textAlign = 'left';
		context.textBaseline = 'middle';
		context.fillStyle = 'rgb(50, 50, 50)';
		context.fillText('Select a node to see more details.', 15, 15);
	};

	const renderTree: Render = ({ context, width, height }) => {
		if (!pointEstimate) return;

		const maxLabelWidth = getMaxLabelWidth(context);
		const treeWidth = width - 2 * margin - maxLabelWidth;
		const treeHeight = height - 2 * margin;

		const localRenderedNodeCoordinates: { node: NodeToDraw; x: number; y: number }[] = [];

		const root = pointEstimate.root;
		if (root.type === 'leaf') return;

		renderNode(root, root);
		renderNode(root.left, root);
		renderNode(root.right, root);

		function renderNode(child: NodeToDraw, parent: NodeToDraw) {
			if (selectedNodeDetails?.nodeNr === child.nr) selectedNode = child;
			if (hoveredNodeNr === child.nr) hoveredNode = child;

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
		if (!pointEstimate) return;

		const treeTimeHeight = getTreeHeight(pointEstimate);

		const maxLabelWidth = getMaxLabelWidth(context);
		const treeWidth = width - 2 * margin - maxLabelWidth;

		const root = pointEstimate.root;
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
		if (!pointEstimate) return;

		const treeTimeHeight = getTreeHeight(pointEstimate);

		const maxLabelWidth = getMaxLabelWidth(context);
		const treeWidth = width - 2 * margin - maxLabelWidth;
		const treeHeight = height - 2 * margin;

		const root = pointEstimate.root;
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

			child.heightDistribution.forEach((bucket, index) => {
				context.lineTo(
					histogramStartX + index * bucketWidth,
					childY - histogramHeight * bucket.normalizedDensity
				);
			});

			context.lineTo(histogramStartX, childY);
			context.fill();

			// render subtree

			renderNode(child.left, child);
			renderNode(child.right, child);
		}
	};

	function getMaxLabelWidth(context: CanvasRenderingContext2D) {
		if (!pointEstimate) return 0.0;

		context.font = `15px sans-serif`;
		context.textAlign = 'left';
		context.textBaseline = 'middle';
		context.fillStyle = 'black';

		return Math.max(
			...getLeafLabels(pointEstimate).map((label) => context.measureText(label).width)
		);
	}

	function onclick(event: Event) {
		selectedNode = getClosestNode(event as MouseEvent);
		globalState.setSelectedNodeNr(selectedNode?.nr, worker);
	}

	function onmousemove(event: Event) {
		hoveredNode = getClosestNode(event as MouseEvent);
		globalState.setHoveredNodeNr(hoveredNode?.nr);
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

	$effect(() => {
		exportSVG = () => {
			// set up canvas

			const width = 750;
			const height = 750;
			// @ts-ignore
			const context = new C2SVG(width, height);

			// render tree

			renderTree({ context, width, height, time: 0 });
			renderDistributions({ context, width, height, time: 0 });
			renderTimeAxis({ context, width, height, time: 0 });

			// convert to SVG

			const serializedSVG = context.getSerializedSvg();

			// download SVG as a file

			const blob = new Blob([serializedSVG], { type: 'image/svg+xml' });
			const url = URL.createObjectURL(blob);

			const a = document.createElement('a');
			a.href = url;
			a.download = 'tree.svg';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);

			setTimeout(() => {
				URL.revokeObjectURL(url);
			}, 100);
		};
	});
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
				<Layer render={renderHints} />
				<Layer render={renderTree} />
				<Layer render={renderDistributions} />
				<Layer render={renderTimeAxis} />
			</Canvas>
		{/if}
	</div>
</div>
