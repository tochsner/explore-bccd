<script lang="ts">
	import type { TreeToDraw } from '$lib/algorithms/treeToDraw';
	import type { GetNodeDetailsResponse, UpdatedPointEstimateResponse } from '$lib/workers/messages';
	import { sendMessage } from '$lib/workers/tree-parser.worker';
	import Histogram from './Histogram.svelte';

	interface Props {
		worker: Worker;
		nodeNr: number;
		pointEstimate: TreeToDraw | undefined;
		onClose: () => void;
	}

	let { nodeNr, pointEstimate = $bindable(), onClose, worker }: Props = $props();

	let nodeDetails = $derived(
		sendMessage<GetNodeDetailsResponse>({ type: 'getNodeDetails', nodeNr }, worker)
	);
	let error = $state();

	function conditionOnSplit(splitFingerprint: number) {
		sendMessage<UpdatedPointEstimateResponse>(
			{
				type: 'conditionOnSplit',
				nodeNr: nodeNr,
				splitFingerprint
			},
			worker
		).then((response) => {
			pointEstimate = response.pointEstimate;
			nodeDetails = sendMessage<GetNodeDetailsResponse>({ type: 'getNodeDetails', nodeNr }, worker);
		});
	}
</script>

<div
	class="relative flex h-full flex-col gap-8 overflow-y-auto rounded-lg border border-gray-400/10 bg-gray-50 p-3 shadow-md shadow-gray-200/30"
>
	<!-- close button -->
	<button
		onclick={onClose}
		class="absolute top-0 right-0 cursor-pointer p-2 text-gray-500 transition-colors hover:text-gray-700"
		aria-label="Close sidebar"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
			<path
				fill-rule="evenodd"
				d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>

	<!-- clade info -->

	{#await nodeDetails then { details: { split, alternativeSplits, heightDistribution } }}
		<div class="flex flex-col gap-1">
			<div class="flex items-center gap-3">
				<h3 class="text-accent text-sm font-semibold uppercase">Selected Clade</h3>
				<span class="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-semibold">
					{#if split.reason === 'bestSplit'}
						Best Clade Split
					{:else}
						Conditioned On Split
					{/if}
				</span>
			</div>

			<div class="flex flex-row gap-1 text-sm">
				<div class="grid grid-cols-2 divide-x divide-gray-400">
					<div class="flex flex-col items-stretch gap-1 pr-2">
						{#each split.leftLabels as label}
							<span class="w-full truncate">{label}</span>
						{/each}
					</div>
					<div class="flex flex-col items-stretch gap-1 pl-2">
						{#each split.rightLabels as label}
							<span class="w-full truncate">{label}</span>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- age distribution -->

		<div class="flex flex-col gap-1">
			<h3 class="text-accent text-sm font-semibold uppercase">Age Distribution</h3>
			<span class="text-sm italic">(conditioned on topology)</span>

			<Histogram histogram={heightDistribution} />
		</div>

		<!-- alternative clade splits -->

		<div class="flex flex-col gap-1">
			<h3 class="text-accent text-sm font-semibold uppercase">Best Alternative Clade Splits</h3>

			{#if alternativeSplits.length < 2}
				<span class="italic">No alternative splits observed.</span>
			{:else}
				<div class="flex flex-col gap-5">
					{#each alternativeSplits as alternativeSplit, idx}
						<div class="flex flex-col gap-2 text-sm">
							<div class="flex items-start justify-between">
								<div class="flex flex-col gap-1">
									<span class="text-sm font-semibold">
										Split {idx + 1}
										{#if alternativeSplit.isBestSplit}
											(best split)
										{/if}
									</span>

									<span class="italic">
										{#if alternativeSplit.localLogDensity < split.localLogDensity}
											{Math.exp(split.localLogDensity - alternativeSplit.localLogDensity).toFixed(
												1
											)} times less likely
										{:else}
											{Math.exp(alternativeSplit.localLogDensity - split.localLogDensity).toFixed(
												1
											)} times more likely
										{/if}
									</span>
								</div>

								<button
									class="border-accent/10 hover:border-accent/40 cursor-pointer rounded-md border bg-white px-3 py-[2px] transition"
									onclick={() => conditionOnSplit(alternativeSplit.fingerprint)}
								>
									Condition on split {idx + 1}
								</button>
							</div>

							<div class="flex flex-row gap-1">
								<div class="grid grid-cols-2 divide-x divide-gray-400">
									<div class="flex flex-col items-stretch gap-1 pr-2">
										{#each alternativeSplit.leftLabels as label}
											<span class="w-full truncate text-xs">{label}</span>
										{/each}
									</div>
									<div class="flex flex-col items-stretch gap-1 pl-2">
										{#each alternativeSplit.rightLabels as label}
											<span class="w-full truncate text-xs">{label}</span>
										{/each}
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/await}
</div>
