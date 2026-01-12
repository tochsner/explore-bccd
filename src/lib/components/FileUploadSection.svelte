<script lang="ts">
	import type { TreeWorkerResponse } from '$lib/workers/messages';
	import Spinner from './Spinner.svelte';

	let {
		worker,
		posteriorTreesLoaded = $bindable()
	}: {
		worker: Worker;
		posteriorTreesLoaded: boolean;
	} = $props();

	let isLoadingPosterior = $state(false);

	async function handlePosteriorTreesUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			isLoadingPosterior = true;
			try {
				const content = await file.text();

				// parse in worker (trees stay in worker memory)
				await new Promise<void>((resolve, reject) => {
					const handler = (e: MessageEvent<TreeWorkerResponse>) => {
						if (e.data.success) {
							posteriorTreesLoaded = true;
							resolve();
						} else {
							reject(new Error(e.data.error));
						}
						worker.removeEventListener('message', handler);
					};
					worker.addEventListener('message', handler);
					worker.postMessage({ type: 'parsePosteriorTrees', content });
				});
			} finally {
				isLoadingPosterior = false;
			}
		}
	}

	async function loadExample() {
		isLoadingPosterior = true;
		try {
			const content = await (await fetch('/iskandari_beast_run2_(preview).trees')).text();

			await new Promise<void>((resolve, reject) => {
				const handler = (e: MessageEvent<TreeWorkerResponse>) => {
					if (e.data.success) {
						posteriorTreesLoaded = true;
						resolve();
					} else {
						reject(new Error(e.data.error));
					}
					worker.removeEventListener('message', handler);
				};
				worker.addEventListener('message', handler);
				worker.postMessage({ type: 'parsePosteriorTrees', content });
			});
		} finally {
			isLoadingPosterior = false;
		}
	}
</script>

<div class="flex flex-col items-center justify-between gap-6">
	<label
		style="background: linear-gradient(45deg, hsla(324, 35%, 40%) 0%, hsla(324, 30%, 45%) 100%)"
		class="flex h-[250px] w-[400px] cursor-pointer flex-col items-center justify-center gap-8 rounded-2xl border border-white/70 p-14 text-white shadow-lg shadow-gray-400/10 transition hover:scale-105"
	>
		{#if isLoadingPosterior}
			<Spinner />
			<span class="mb-2 text-center text-lg">Loading and parsing trees...</span>
		{:else if !posteriorTreesLoaded}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="size-16"
			>
				<path stroke="none" d="M0 0h24v24H0z" fill="none" />
				<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
				<path d="M7 9l5 -5l5 5" />
				<path d="M12 4l0 12" />
			</svg>
			<span class="mb-2 text-center text-lg">Upload your posterior trees (.trees)</span>
		{:else}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="size-20 text-green-700"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
					d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"
				/><path d="M9 12l2 2l4 -4" /></svg
			>

			<span class="mb-2 text-center text-lg">Posterior trees loaded</span>
		{/if}

		<input
			type="file"
			accept=".trees"
			hidden
			onchange={handlePosteriorTreesUpload}
			disabled={isLoadingPosterior}
			class="file:bg-accent-light file:text-accent pointer-events-none mt-2 block w-full file:cursor-pointer file:rounded-md file:border-0 file:px-4 file:py-2 file:font-semibold"
		/>
	</label>

	{#if !posteriorTreesLoaded && !isLoadingPosterior}
		<span>or</span>

		<button
			style="background: linear-gradient(45deg, hsla(324, 0%, 50%) 0%, hsla(324, 0%, 55%) 100%)"
			class="flex h-[30px] w-[400px] cursor-pointer flex-col items-center justify-center gap-8 rounded-2xl border border-white/70 p-10 text-white shadow-lg shadow-gray-400/10 transition hover:scale-105"
			onclick={loadExample}
		>
			{#if isLoadingPosterior}
				<Spinner />
				<span class="mb-2 text-center text-lg">Loading and parsing trees...</span>
			{:else if !posteriorTreesLoaded}
				<span class="text-center text-lg">Try out an example</span>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="size-20 text-green-700"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
						d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"
					/><path d="M9 12l2 2l4 -4" /></svg
				>

				<span class="mb-2 text-center text-lg">Posterior trees loaded</span>
			{/if}
		</button>
	{/if}
</div>
