<script>
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>BCCD</title>
	<meta
		name="description"
		content="Explore the time tree distribution of your phylogenetic MCMC analysis."
	/>
	<meta name="robots" content="index,follow" />
</svelte:head>

<div class="bg-background text-dark flex min-h-lvh w-lvw flex-col items-center font-sans">
	<header class="bg-accent/10 z-10 flex w-full rounded-b-2xl px-8 py-6">
		<span class="text-[2rem] font-bold">Explore<span class="text-accent">BCCD</span></span>
	</header>

	{@render children()}
</div>
