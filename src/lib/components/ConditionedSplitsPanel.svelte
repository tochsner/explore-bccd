<script lang="ts">
	import type { GlobalState } from '$lib/context/globalContext.svelte';
	import { sendMessage } from '$lib/workers/tree-parser.worker';

	let {
		worker,
		globalState
	}: {
		worker: Worker;
		globalState: GlobalState;
	} = $props();

	const conditionedSplits = $derived(globalState.getConditionedSplits());

	function handleMouseClick(nodeNr: number) {
		globalState.setSelectedNodeNr(nodeNr, worker);
	}

	function handleMouseEnter(nodeNr: number) {
		globalState.setHoveredNodeNr(nodeNr);
	}

	function handleMouseLeave() {
		globalState.setHoveredNodeNr(undefined);
	}

	function removeCondition(cladeFingerprint: number) {
		sendMessage(
			{
				type: 'removeConditioningOnSplit',
				cladeFingerprint
			},
			worker
		).then(() => {
			globalState.synchronizeStateWithWorker(worker);
		});
	}
</script>

{#if conditionedSplits && conditionedSplits.length > 0}
	<div
		class="m-4 flex items-center gap-3 overflow-x-auto rounded-lg border border-gray-400/10 bg-gray-50 p-3 shadow-md shadow-gray-200/30"
	>
		<h3 class="text-accent shrink-0 text-sm font-semibold uppercase">Conditioned Splits:</h3>
		<div class="flex gap-2">
			{#each conditionedSplits as split, idx}
				<div
					class="group relative flex cursor-pointer items-center gap-2 rounded-md border border-gray-400/20 bg-white px-3 py-2 shadow-sm transition-all hover:border-gray-400/40 hover:shadow-md"
					onmouseenter={() => handleMouseEnter(split.nodeNr)}
					onmouseleave={() => handleMouseLeave(split.nodeNr)}
					onclick={() => handleMouseClick(split.nodeNr)}
					role="complementary"
				>
					Condition #{idx + 1}

					<!-- remove button -->
					<button
						onclick={(e) => {
							e.stopPropagation();
							removeCondition(split.cladeFingerprint);
						}}
						class="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
						aria-label="Remove conditioning"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
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
				</div>
			{/each}
		</div>
	</div>
{/if}
