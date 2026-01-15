<script lang="ts">
	let {
		open = $bindable(false),
		getSVGString
	}: {
		open: boolean;
		getSVGString: (width: number, height: number) => string;
	} = $props();

	let width = $state(750);
	let height = $state(750);

	function downloadSVG() {
		const svgString = getSVGString(width, height);
		const blob = new Blob([svgString], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = 'tree.svg';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);

		setTimeout(() => URL.revokeObjectURL(url), 100);
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
			<h2 class="mb-4 text-lg font-semibold">Export SVG</h2>

			<div class="mb-4 flex flex-col gap-3">
				<label class="flex flex-col gap-1">
					<span class="text-sm text-gray-600">Width (px)</span>
					<input
						type="number"
						bind:value={width}
						min="100"
						max="4000"
						class="rounded-md border border-gray-300 px-3 py-2"
					/>
				</label>

				<label class="flex flex-col gap-1">
					<span class="text-sm text-gray-600">Height (px)</span>
					<input
						type="number"
						bind:value={height}
						min="100"
						max="4000"
						class="rounded-md border border-gray-300 px-3 py-2"
					/>
				</label>
			</div>

			<div class="flex justify-end gap-2">
				<button
					class="cursor-pointer rounded-md border border-gray-300 px-4 py-2 transition hover:bg-gray-100"
					onclick={() => (open = false)}
				>
					Cancel
				</button>
				<button
					class="bg-accent cursor-pointer rounded-md px-4 py-2 text-white transition hover:opacity-90"
					onclick={downloadSVG}
				>
					Download
				</button>
			</div>
		</div>
	</div>
{/if}
