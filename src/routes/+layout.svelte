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

<div class="bg-background text-dark flex min-h-lvh w-lvw flex-col items-center pt-16 font-sans">
	<header
		class="bg-accent/10 absolute top-0 right-0 left-0 z-10 flex w-full px-8 py-6 rounded-b-2xl"
	>
		<span class="text-[2rem] font-bold">Explore<span class="text-accent">BCCD</span></span>
	</header>

	{@render children()}
</div>
