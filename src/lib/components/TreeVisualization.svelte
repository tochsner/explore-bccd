<script lang="ts">
	import { untrack } from 'svelte';
	import { phylotree } from 'phylotree';
	import Spinner from './Spinner.svelte';

	let {
		newick
	}: {
		newick: string;
	} = $props();

	let container = $state<HTMLDivElement>();
	let tree: any = $state();
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	let clientWidth = $state();
	let clientHeight = $state();

	// use $effect to wait for both newick and container to be available
	$effect(() => {
		// only track newick and container changes
		const currentNewick = newick;
		const currentContainer = container;

		// wait for both newick and container to be available
		if (!currentNewick || !currentContainer) {
			return;
		}

		// update state without triggering the effect
		untrack(() => {
			try {
				// clear previous content
				currentContainer.innerHTML = '';

				// create phylotree instance
				tree = new phylotree(currentNewick);

				// render the tree
				const renderedTree = tree.render({
					width: clientWidth,
					height: clientHeight,
					'align-tips': 'true',
					'left-right-spacing': 'fit-to-size',
					'top-bottom-spacing': 'fit-to-size',
					brush: 'false'
				});

				currentContainer.appendChild(renderedTree.show());

				isLoading = false;
				error = null;
			} catch (err) {
				console.error('Error rendering tree:', err);
				error = err instanceof Error ? err.message : 'Failed to render tree';
				isLoading = false;
			}
		});
	});
</script>

<div class="relative h-full w-full">
	<!-- Always render the container so it can be bound -->
	<div
		class="tree-container"
		class:opacity-0={isLoading || error}
		bind:this={container}
		bind:clientHeight
		bind:clientWidth
	></div>

	<!-- Loading overlay -->
	{#if isLoading}
		<div class="absolute inset-0 flex items-center justify-center bg-white">
			<Spinner />
		</div>
	{/if}

	<!-- Error overlay -->
	{#if error}
		<div class="absolute inset-0 flex items-center justify-center bg-white">
			<span class="text-red-600">Error: {error}</span>
		</div>
	{/if}
</div>
