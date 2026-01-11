<script lang="ts">
	import { TreeLayout } from '$lib/algorithms/treeLayout';
	import type { NodeToDraw, TreeToDraw } from '$lib/algorithms/treeToDraw';
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
		const xCoordinates = treeLayout.getXCoordinates();
		const yCoordinates = treeLayout.getYCoordinates();

		function renderNode(child: NodeToDraw, parent: NodeToDraw) {
			const parentX = 100 * (xCoordinates.get(parent.nr) || 0.0);
			const parentY = 100 * (yCoordinates.get(parent.nr) || 0.0);
			const childX = 100 * (xCoordinates.get(child.nr) || 0.0);
			const childY = 100 * (yCoordinates.get(child.nr) || 0.0);

			context.beginPath();
			context.moveTo(parentX, parentY);
			context.lineTo(parentX, childY);
			context.stroke();

			context.beginPath();
			context.moveTo(parentX, childY);
			context.lineTo(childX, childY);
			context.stroke();

			if (child.type === 'leaf') {
				context.font = `15px sans-serif`;
				context.textAlign = 'left';
				context.textBaseline = 'middle';
				context.fillStyle = 'black';
				context.fillText(child.label + ' ' + child.nr, childX + 10, childY);
			} else {
				context.font = `10px sans-serif`;
				context.textAlign = 'left';
				context.textBaseline = 'middle';
				context.fillStyle = 'black';
				context.fillText(child.nr.toString(), childX + 2, childY);

				renderNode(child.left, child);
				renderNode(child.right, child);
			}
		}

		const root = treeToDraw.root;
		if (root.type === 'leaf') return;

		renderNode(root.left, root);
		renderNode(root.right, root);

		context.font = `${width / 10}px sans-serif`;
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillStyle = 'tomato';
		context.fillText('hello world', width / 2, height / 2);
	};
</script>

<div class="h-full w-full flex-1" bind:clientHeight={height} bind:clientWidth={width}>
	{#if height && width}
		<Canvas {height} {width}>
			<Layer {render} />
		</Canvas>
	{/if}
</div>
