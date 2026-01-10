<script lang="ts">
	import { onMount } from 'svelte';
	import FileUploadSection from '$lib/components/FileUploadSection.svelte';
	import BuildBCCD from '$lib/components/BuildBCCD.svelte';
	import TreeParserWorker from '$lib/workers/tree-parser.worker?worker';

	let worker: Worker | undefined = $state();
	let posteriorTreesLoaded = $state(false);
	let bccdBuilt = $state(false);
	
    let pointEstimateNewick = $state("");

	let stage = $derived.by(() => {
		if (!posteriorTreesLoaded) return 'loadTrees';
		else if (!bccdBuilt) return 'buildModel';
		else return 'explore';
	});

	onMount(() => {
        worker = new TreeParserWorker();
		return () => {
			worker?.terminate();
		};
	});
</script>

{#if worker}
	{#if stage == 'loadTrees'}
		<div class="mx-auto w-full max-w-[900px] px-6 py-20">
			<p
				class="text-dark text-center text-xl leading-normal font-extrabold sm:text-4xl md:text-5xl md:leading-tight"
			>
				Explore your <span class="text-accent">phylogenetic posterior tree</span> distribution
			</p>
		</div>

		<FileUploadSection {worker} bind:posteriorTreesLoaded />
	{:else if stage == 'buildModel'}
		<BuildBCCD {worker} bind:bccdBuilt bind:pointEstimateNewick />
	{:else if stage == 'explore'}
		<div class="mt-32 flex h-full w-full flex-col items-center justify-center gap-8">
			<span class="text-center text-lg">BCCD built successfully! Ready to explore.</span>
            {pointEstimateNewick}
		</div>
	{/if}
{/if}
