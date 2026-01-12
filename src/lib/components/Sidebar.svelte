<script lang="ts">
	import { getCladeLabels, type NodeToDraw } from '$lib/algorithms/treeToDraw';
	import Histogram from './Histogram.svelte';

	interface Props {
		node: NodeToDraw | undefined;
		onClose: () => void;
	}

	let { node, onClose }: Props = $props();

	let cladeLabels = $derived(node ? getCladeLabels(node) : []);
</script>

{#if node !== undefined}
	<div class="h-full rounded-lg border border-gray-400/10 bg-gray-50 shadow-md shadow-gray-200/30">
		<div class="relative flex flex-1 flex-col gap-6 p-4 pb-4">
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
				<h3 class="text-sm font-semibold uppercase">Selected Clade</h3>

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
				<div class="flex flex-col gap-1">
					<h3 class="text-sm font-semibold uppercase">Age Distribution</h3>
					<span class="text-sm italic">(conditioned on topology)</span>

					<Histogram histogram={node.heightDistribution} />
				</div>
			{/if}
		</div>
	</div>
{/if}
