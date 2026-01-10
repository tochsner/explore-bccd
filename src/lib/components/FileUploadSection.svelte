<script lang="ts">
	import type { TreeWorkerResponse } from '$lib/workers/messages';

	let {
		worker,
		posteriorTreesLoaded = $bindable(),
		summaryTreeLoaded = $bindable()
	}: {
		worker: Worker;
		posteriorTreesLoaded: boolean;
		summaryTreeLoaded: boolean;
	} = $props();

	let isLoadingPosterior = $state(false);
	let isLoadingSummary = $state(false);

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

	async function handleSummaryTreeUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			isLoadingSummary = true;
			try {
				const content = await file.text();

				// parse in worker (tree stays in worker memory)
				await new Promise<void>((resolve, reject) => {
					const handler = (e: MessageEvent<TreeWorkerResponse>) => {
						if (e.data.success) {
							summaryTreeLoaded = true;
							resolve();
						} else {
							reject(new Error(e.data.error));
						}
						worker.removeEventListener('message', handler);
					};
					worker.addEventListener('message', handler);
					worker.postMessage({ type: 'parseSummaryTree', content });
				});
			} finally {
				isLoadingSummary = false;
			}
		}
	}
</script>

<div class="flex items-stretch justify-between gap-12">
	<div
		class="bg-light-gray border-light-gray flex h-[250px] w-[400px] flex-col items-center justify-center gap-8 rounded-2xl border p-14 shadow-lg shadow-gray-400/10 transition hover:scale-105"
	>
		<label class="flex w-full cursor-pointer flex-col items-center gap-6">
			{#if isLoadingPosterior}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-16 animate-spin"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M12 3a9 9 0 1 0 9 9" />
				</svg>
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
				<span class="mb-2 text-center text-lg">1. Upload your posterior trees (.trees)</span>
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
	</div>
	<div
		class="bg-light-gray border-light-gray flex h-[250px] w-[400px] flex-col items-center justify-center gap-8 rounded-2xl border p-14 shadow-lg shadow-gray-400/10 transition hover:scale-105"
	>
		<label class="flex w-full cursor-pointer flex-col items-center gap-6">
			{#if isLoadingSummary}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-16 animate-spin"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M12 3a9 9 0 1 0 9 9" />
				</svg>
				<span class="mb-2 text-center text-lg">Loading and parsing tree...</span>
			{:else if !summaryTreeLoaded}
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
				<span class="mb-2 text-center text-lg"
					>2. Upload your topology summary tree (.trees or .nxs)</span
				>
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

				<span class="mb-2 text-center text-lg">Summary tree loaded</span>
			{/if}

			<input
				type="file"
				accept=".trees,.nxs"
				hidden
				onchange={handleSummaryTreeUpload}
				disabled={isLoadingSummary}
				class="file:bg-accent-light file:text-accent mt-2 block w-full file:cursor-pointer file:rounded-md file:border-0 file:px-4 file:py-2 file:font-semibold"
			/>
		</label>
	</div>
</div>
