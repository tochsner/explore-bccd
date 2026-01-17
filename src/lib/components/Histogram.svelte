<script lang="ts">
	import Chart from 'chart.js/auto';
	import { type Histogram } from '$lib/algorithms/histogram';
	import { formatNumber } from '$lib/utils/formatter';

	let { histogram }: { histogram: Histogram } = $props();
	let canvas: HTMLCanvasElement | undefined = $state();

	const accentColor = getComputedStyle(document.body).getPropertyValue('--color-accent');

	const data = $derived({
		labels: [histogram[0].bucketStart, ...histogram.map((h) => h.bucketEnd)].map(formatNumber),
		datasets: [
			{
				data: histogram.map((h) => h.normalizedDensity),
				fill: true,
				borderColor: accentColor,
				backgroundColor: accentColor,
				tension: 0.3,
				showLine: false,
				pointRadius: 0
			}
		]
	});

	const options = {
		animation: false,
		plugins: {
			legend: {
				display: false
			}
		}
	};

	$effect(() => {
		let chart = undefined;
		if (canvas) {
			chart = new Chart(canvas, {
				type: 'line',
				data,
				options
			});
		}
		return () => {
			chart?.destroy();
		};
	});
</script>

<div class="relative h-fit w-full">
	<canvas bind:this={canvas}></canvas>
</div>
