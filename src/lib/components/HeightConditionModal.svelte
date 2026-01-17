<script lang="ts">
	let {
		open = $bindable(false),
		onConfirm
	}: {
		open: boolean;
		onConfirm: (height: number) => void;
	} = $props();

	let height = $state(0);

	function handleConfirm() {
		onConfirm(height);
		open = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			open = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
		onclick={handleBackdropClick}
	>
		<div class="w-80 rounded-lg bg-white p-6 shadow-lg">
			<h2 class="mb-4 text-lg font-semibold">Condition on Age</h2>

			<div class="mb-4 flex flex-col gap-3">
				<label class="flex flex-col gap-1">
					<span class="text-sm text-gray-600">Age</span>
					<input
						type="number"
						bind:value={height}
						step="0.01"
						class="rounded-md border border-gray-300 px-3 py-2"
					/>
				</label>
			</div>

			<p class="mb-4 text-sm">
				This allows to explore the distribution conditioned on the age of this clade. <span
					class="font-semibold"
					>This only affects the other age distributions, not the displayed tree topology</span
				>.
			</p>

			<div class="flex justify-end gap-2">
				<button
					class="cursor-pointer rounded-md border border-gray-300 px-4 py-2 transition hover:bg-gray-100"
					onclick={() => (open = false)}
				>
					Cancel
				</button>
				<button
					class="bg-accent cursor-pointer rounded-md px-4 py-2 text-white transition hover:opacity-90"
					onclick={handleConfirm}
				>
					Confirm
				</button>
			</div>
		</div>
	</div>
{/if}
