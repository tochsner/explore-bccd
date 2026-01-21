<script>
	import '../app.css';
	let { children } = $props();

	import { Chart } from 'chart.js';
	import annotationPlugin from 'chartjs-plugin-annotation';

	Chart.register(annotationPlugin);
</script>

<svelte:head>
	<title>Explore BCCD</title>
	<meta
		name="description"
		content="Explore the time tree distribution of your phylogenetic MCMC analysis."
	/>
	<meta name="robots" content="index,follow" />
</svelte:head>

{@render children()}
