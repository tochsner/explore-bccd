<script lang="ts">
	import { type GlobalState } from '$lib/context/globalContext.svelte';
	import { sendMessage } from '$lib/workers/tree-parser.worker';
	import Spinner from './Spinner.svelte';

	let {
		worker,
		bccdBuilt = $bindable(),
		globalState
	}: {
		worker: Worker;
		bccdBuilt: boolean;
		globalState: GlobalState;
	} = $props();

	let isBuilding = $state(true);
	let error = $state<string | null>(null);

	$effect(() => {
		sendMessage(
			{
				type: 'buildBCCD'
			},
			worker
		).then(() => {
			bccdBuilt = true;
			isBuilding = false;
			globalState.synchronizeStateWithWorker(worker);
		});
	});
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-8">
	{#if isBuilding}
		<Spinner />
		<span class="text-center text-lg">Building BCCD model...</span>
	{:else if error}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-16 text-red-600"
		>
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
			<path d="M12 9v4" />
			<path d="M12 16v.01" />
		</svg>
		<span class="text-center text-lg text-red-600">Error: {error}</span>
	{/if}
</div>
