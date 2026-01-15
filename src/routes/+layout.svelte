<script>
	import '../app.css';
	let { children } = $props();
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
