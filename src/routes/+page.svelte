<script lang="ts">
	import { onMount } from 'svelte';
	import FileUploadSection from '$lib/components/FileUploadSection.svelte';
	import BuildBCCD from '$lib/components/BuildBCCD.svelte';
	import TreeVisualization from '$lib/components/TreeVisualization.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ConditionedSplitsPanel from '$lib/components/ConditionedSplitsPanel.svelte';
	import ExportSVGModal from '$lib/components/ExportSVGModal.svelte';
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

	let exportSVG = $state<(width: number, height: number) => string>(() => '');
	let exportModalOpen = $state(false);

	onMount(() => {
		worker = new TreeParserWorker();
		return () => {
			worker?.terminate();
		};
	});
</script>

<div
	class="bg-background text-dark flex h-lvh w-lvw flex-col items-center justify-stretch font-sans"
>
	<header class="bg-accent/10 z-10 flex w-full justify-between rounded-b-2xl px-8 py-4">
		<span class="text-[1.8rem] font-bold">Explore<span class="text-accent">BCCD</span></span>

		{#if stage === 'explore'}
			<div class="flex gap-4">
				<button
					class="cursor-pointer rounded-lg border border-white bg-white/20 px-4 py-2 transition hover:bg-white/50"
					onclick={() => (exportModalOpen = true)}
				>
					Export SVG
				</button>
				<a
					class="cursor-pointer rounded-lg border border-white bg-white/20 px-4 py-2 transition hover:bg-white/50"
					href="/"
					data-sveltekit-reload
				>
					Explore a different dataset
				</a>
			</div>
		{/if}
	</header>
	{#if worker}
		<div class="flex min-h-0 w-full flex-1 flex-col items-center">
			{#if stage == 'loadTrees'}
				<div class="mx-auto w-full max-w-[900px] px-6 py-20">
					<p
						class="text-dark text-center text-xl leading-normal font-extrabold sm:text-4xl md:text-5xl md:leading-tight"
					>
						Explore your <span class="text-accent">phylogenetic posterior tree</span> distribution
					</p>
				</div>

				<FileUploadSection {worker} {globalState} bind:posteriorTreesLoaded />

				<span class="text-sn self-center px-2 pt-10 text-gray-500 italic">
					All processing is local. Your data never leaves your device.
				</span>

				<div class="flex items-center gap-5 pt-16 pb-4">
					<a
						href="https://github.com/tochsner/explore-bccd"
						aria-label="GitHub Repository"
						target="_blank"
						class="hover:border-accent/10 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/80 px-4 py-2 font-semibold text-gray-800 shadow transition hover:scale-105"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="icon icon-tabler icons-tabler-outline icon-tabler-brand-github"
							><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
								d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"
							/></svg
						>
						GitHub
					</a>

					<hr class="my-2 h-full border-l border-gray-300" />

					<span class="text-base font-medium text-gray-700">Check out</span>

					<div class="flex flex-row gap-4">
						<a
							href="https://phylodata.com"
							target="_blank"
							class="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/80 px-4 py-2 font-semibold shadow transition hover:scale-105"
						>
							<span>
								<span style="color: #54763E;">Phylo</span>Data
							</span>
						</a>
						<a
							href="https://codephylo.github.io/phylospec/"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/80 px-4 py-2 font-semibold shadow transition hover:scale-105"
						>
							<span>
								<span style="color: #17897D;">Phylo</span>Spec
							</span>
						</a>
					</div>
				</div>
			{:else if stage == 'buildModel'}
				<BuildBCCD {worker} {globalState} bind:bccdBuilt />
			{:else if stage == 'explore'}
				<div class="flex h-full w-full min-w-0 flex-1 items-stretch">
					<div
						class={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${hasSelectedNode ? 'md:w-[calc(100%-350px)]' : ''}`}
					>
						<TreeVisualization {worker} {globalState} bind:exportSVG />

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
</div>

<ExportSVGModal bind:open={exportModalOpen} getSVGString={exportSVG} />
