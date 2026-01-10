<script lang="ts">
	import type { TreeWorkerResponse } from '$lib/workers/messages';
	import Spinner from './Spinner.svelte';

	let {
		worker,
		bccdBuilt = $bindable()
	}: {
		worker: Worker;
		bccdBuilt: boolean;
	} = $props();

	let isBuilding = $state(true);
	let error = $state<string | null>(null);

	// trigger BCCD building when component mounts
	$effect(() => {
		const handler = (e: MessageEvent<TreeWorkerResponse>) => {
			if (e.data.success) {
				bccdBuilt = true;
				isBuilding = false;
			} else {
				error = e.data.error;
				isBuilding = false;
			}
			worker.removeEventListener('message', handler);
		};

		worker.addEventListener('message', handler);
		worker.postMessage({ type: 'buildBCCD' });

		return () => {
			worker.removeEventListener('message', handler);
		};
	});
</script>

<div class="mt-32 flex h-full w-full flex-col items-center justify-center gap-8">
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
