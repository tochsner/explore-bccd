<script lang="ts">
	import { onMount } from 'svelte';
	import FileUploadSection from '$lib/components/FileUploadSection.svelte';
	import BuildBCCD from '$lib/components/BuildBCCD.svelte';
	import TreeVisualization from '$lib/components/TreeVisualization.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ConditionedSplitsPanel from '$lib/components/ConditionedSplitsPanel.svelte';
	import TreeParserWorker from '$lib/workers/tree-parser.worker?worker';
	import { createGlobalState } from '$lib/context/globalContext.svelte';

	let worker: Worker | undefined = $state();
	let posteriorTreesLoaded = $state(false);
	let bccdBuilt = $state(false);

	let stage = $derived.by(() => {
		if (!posteriorTreesLoaded) return 'loadTrees';
		else if (!bccdBuilt) return 'buildModel';
		else return 'explore';
	});

	const globalState = createGlobalState();
	const hasSelectedNode = $derived(!!globalState.getSelectedNodeDetails());

	onMount(() => {
		worker = new TreeParserWorker();
		return () => {
			worker?.terminate();
		};
	});
</script>

{#if worker}
	<div class="flex h-full w-full flex-1 flex-col items-center overflow-y-auto">
		{#if stage == 'loadTrees'}
			<div class="mx-auto w-full max-w-[900px] px-6 py-20">
				<p
					class="text-dark text-center text-xl leading-normal font-extrabold sm:text-4xl md:text-5xl md:leading-tight"
				>
					Explore your <span class="text-accent">phylogenetic posterior tree</span> distribution
				</p>
			</div>

			<FileUploadSection {worker} {globalState} bind:posteriorTreesLoaded />
		{:else if stage == 'buildModel'}
			<BuildBCCD {worker} {globalState} bind:bccdBuilt />
		{:else if stage == 'explore'}
			<div class="flex h-full w-full min-w-0 flex-1 items-stretch">
				<div
					class={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${hasSelectedNode ? 'md:w-[calc(100%-350px)]' : ''}`}
				>
					<TreeVisualization {worker} {globalState} />

					<ConditionedSplitsPanel {worker} {globalState} />
				</div>
				{#if hasSelectedNode}
					<div class="top-0 h-full w-[375px] shrink-0 p-4 pl-0">
						<Sidebar {worker} {globalState} />
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
