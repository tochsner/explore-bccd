<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';
	import { type Histogram } from '$lib/algorithms/histogram';
	import { formatNumber } from '$lib/utils/formatter';

	Chart.register(annotationPlugin);

	let { histogram }: { histogram: Histogram } = $props();
	let canvas: HTMLCanvasElement | undefined = $state();
	let chartInstance: Chart | undefined = $state();

	// export modal state
	let exportModalOpen = $state(false);
	let exportWidth = $state(6); // inches
	let exportHeight = $state(3); // inches
	let exportDPI = $state(150);

	const accentColor = getComputedStyle(document.body).getPropertyValue('--color-accent');

	const data = $derived({
		labels: [histogram.buckets[0].bucketStart, ...histogram.buckets.map((h) => h.bucketEnd)].map(
			(x) => formatNumber(x)
		),
		datasets: [
			{
				data: histogram.buckets.map((h) => h.normalizedDensity),
				fill: true,
				borderColor: accentColor,
				backgroundColor: accentColor,
				tension: 0.3,
				showLine: false,
				pointRadius: 0
			}
		]
	});

	// find the x-axis label index for a given value
	function valueToLabelIndex(value: number): number {
		const buckets = histogram.buckets;
		const min = buckets[0].bucketStart;
		const max = buckets[buckets.length - 1].bucketEnd;
		const numLabels = buckets.length + 1;

		// clamp value to display range
		const clampedValue = Math.max(min, Math.min(max, value));
		return ((clampedValue - min) / (max - min)) * (numLabels - 1);
	}

	const options = $derived({
		animation: false as const,
		scales: {
			y: {
				beginAtZero: true
			}
		},
		plugins: {
			legend: {
				display: false
			},
			annotation: {
				annotations: {
					credibleIntervalBox: {
						type: 'box' as const,
						xMin: valueToLabelIndex(histogram.credibleInterval.lower),
						xMax: valueToLabelIndex(histogram.credibleInterval.upper),
						yMin: 0,
						backgroundColor: 'rgba(100, 100, 100, 0.15)',
						borderWidth: 0
					},
					meanLine: {
						type: 'line' as const,
						xMin: valueToLabelIndex(histogram.mean),
						xMax: valueToLabelIndex(histogram.mean),
						yMin: 0,
						borderColor: 'rgba(50, 50, 50, 0.8)',
						borderWidth: 2,
						borderDash: [5, 3]
					}
				}
			}
		}
	});

	$effect(() => {
		if (canvas && histogram.buckets.length > 0) {
			chartInstance = new Chart(canvas, {
				type: 'line',
				data: data,
				options: options
			});
		}
		return () => {
			chartInstance?.destroy();
			chartInstance = undefined;
		};
	});

	function downloadPNG() {
		const scale = exportDPI / 72;
		const finalWidth = Math.round(exportWidth * exportDPI);
		const finalHeight = Math.round(exportHeight * exportDPI);

		// create canvas at final resolution
		const offscreenCanvas = document.createElement('canvas');
		offscreenCanvas.width = finalWidth;
		offscreenCanvas.height = finalHeight;

		// scale font sizes and line widths proportionally
		const scaledOptions = {
			...options,
			animation: false,
			responsive: false,
			scales: {
				...options.scales,
				x: {
					ticks: { font: { size: 12 * scale } }
				},
				y: {
					...options.scales.y,
					ticks: { font: { size: 12 * scale } }
				}
			},
			plugins: {
				...options.plugins,
				annotation: {
					annotations: {
						credibleIntervalBox: {
							...options.plugins.annotation.annotations.credibleIntervalBox
						},
						meanLine: {
							...options.plugins.annotation.annotations.meanLine,
							borderWidth: 2 * scale
						}
					}
				}
			}
		};

		const tempChart = new Chart(offscreenCanvas, {
			type: 'line',
			data: JSON.parse(JSON.stringify(data)),
			options: scaledOptions
		});

		// export and download
		const link = document.createElement('a');
		link.href = offscreenCanvas.toDataURL('image/png');
		link.download = 'histogram.png';
		link.click();

		tempChart.destroy();
		exportModalOpen = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			exportModalOpen = false;
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			exportModalOpen = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if histogram.buckets.length > 0}
	<div class="relative h-fit w-full">
		<canvas bind:this={canvas}></canvas>
		<button
			onclick={() => (exportModalOpen = true)}
			class="border-accent/30 hover:border-accent/60 absolute top-1 right-1 cursor-pointer rounded border bg-white/80 px-2 py-0.5 text-xs hover:bg-white hover:text-gray-700"
		>
			Export PNG
		</button>
	</div>
{/if}

{#if exportModalOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
		onclick={handleBackdropClick}
	>
		<div class="w-80 rounded-lg bg-white p-6 shadow-lg">
			<h2 class="mb-4 text-lg font-semibold">Export PNG</h2>

			<div class="mb-4 flex flex-col gap-3">
				<label class="flex flex-col gap-1">
					<span class="text-sm text-gray-600">Width (inches)</span>
					<input
						type="number"
						bind:value={exportWidth}
						min="1"
						max="20"
						step="0.5"
						class="rounded-md border border-gray-300 px-3 py-2"
					/>
				</label>

				<label class="flex flex-col gap-1">
					<span class="text-sm text-gray-600">Height (inches)</span>
					<input
						type="number"
						bind:value={exportHeight}
						min="1"
						max="20"
						step="0.5"
						class="rounded-md border border-gray-300 px-3 py-2"
					/>
				</label>

				<label class="flex flex-col gap-1">
					<span class="text-sm text-gray-600">DPI</span>
					<input
						type="number"
						bind:value={exportDPI}
						min="72"
						max="600"
						class="rounded-md border border-gray-300 px-3 py-2"
					/>
					<span class="text-xs text-gray-400">
						{Math.round(exportWidth * exportDPI)} × {Math.round(exportHeight * exportDPI)} px
					</span>
				</label>
			</div>

			<div class="flex justify-end gap-2">
				<button
					class="cursor-pointer rounded-md border border-gray-300 px-4 py-2 transition hover:bg-gray-100"
					onclick={() => (exportModalOpen = false)}
				>
					Cancel
				</button>
				<button
					class="bg-accent cursor-pointer rounded-md px-4 py-2 text-white transition hover:opacity-90"
					onclick={downloadPNG}
				>
					Download
				</button>
			</div>
		</div>
	</div>
{/if}
