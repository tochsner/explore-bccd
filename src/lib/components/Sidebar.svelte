<script lang="ts">
	import { getCladeLabels, type NodeToDraw } from '$lib/algorithms/treeToDraw';
	import type { ErrorResponse, GetPotentialSplitsResponse } from '$lib/workers/messages';
	import Histogram from './Histogram.svelte';

	interface Props {
		worker: Worker;
		node: NodeToDraw | undefined;
		onClose: () => void;
	}

	let { node, onClose, worker }: Props = $props();

	let cladeLabels = $derived(node ? getCladeLabels(node) : []);

	let isSplitsLoading = $state(false);
	let potentialSplits: {
		leftLabels: string[];
		rightLabels: string[];
		logDensity: number;
	}[] = $state([]);
	let error = $state();

	$effect(() => {
		const handler = (e: MessageEvent<ErrorResponse | GetPotentialSplitsResponse>) => {
			if (e.data.success) {
				isSplitsLoading = false;
				potentialSplits = e.data.splits;
			} else {
				error = e.data.error;
				isSplitsLoading = false;
			}
			worker.removeEventListener('message', handler);
		};

		worker.addEventListener('message', handler);
		worker.postMessage({ type: 'getPotentialSplits', nodeNr: node?.nr });

		return () => {
			worker.removeEventListener('message', handler);
		};
	});
</script>

{#if node !== undefined}
	<div
		class="relative flex h-full flex-col gap-8 overflow-y-scroll rounded-lg border border-gray-400/10 bg-gray-50 p-3 shadow-md shadow-gray-200/30"
	>
		<!-- close button -->
		<button
			onclick={onClose}
			class="absolute top-0 right-0 cursor-pointer p-2 text-gray-500 transition-colors hover:text-gray-700"
			aria-label="Close sidebar"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>

		<div class="flex flex-col gap-1">
			<h3 class="text-accent text-sm font-semibold uppercase">Selected Clade</h3>

			<div class="flex flex-col gap-1 text-sm">
				{#each cladeLabels.slice(0, 4) as label}
					<span>{label}</span>
				{/each}

				{#if cladeLabels.length > 4}
					<span class="italic">and {cladeLabels.length - 4} more taxa</span>
				{/if}
			</div>
		</div>

		{#if node.type === 'internal'}
			{@const mainSplit = potentialSplits.at(0)}

			<div class="flex flex-col gap-1">
				<h3 class="text-accent text-sm font-semibold uppercase">Age Distribution</h3>
				<span class="text-sm italic">(conditioned on topology)</span>

				<Histogram histogram={node.heightDistribution} />
			</div>

			<div class="flex flex-col gap-1">
				<h3 class="text-accent text-sm font-semibold uppercase">Best Alternative Clade Splits</h3>

				{#if potentialSplits.length < 2 || !mainSplit}
					<span class="italic"> No alternative splits observed.</span>
				{:else}
					<div class="flex flex-col gap-5">
						{#each potentialSplits.slice(1) as split, idx}
							<div class="flex flex-col gap-1 text-sm">
								<span class="text-sm font-semibold">Split {idx + 1}</span>

								<span class="italic">
									{Math.exp(mainSplit.logDensity - split.logDensity).toFixed(1)} times less likely</span
								>

								<div class="flex flex-row gap-1">
									<div class="divide-accent grid grid-cols-2 divide-x">
										<div class="flex flex-col items-stretch gap-1 pr-2">
											{#each split.leftLabels as label}
												<span class="w-full truncate text-xs">{label}</span>
											{/each}
										</div>
										<div class="flex flex-col items-stretch gap-1 pl-2">
											{#each split.rightLabels as label}
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
		{/if}
	</div>
{/if}
