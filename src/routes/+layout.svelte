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

<div class="bg-background text-dark flex h-lvh w-lvw flex-col items-center font-sans">
	<header class="bg-accent/10 z-10 flex w-full justify-between rounded-b-2xl px-8 py-4">
		<span class="text-[1.8rem] font-bold">Explore<span class="text-accent">BCCD</span></span>

		<a
			class="cursor-pointer rounded-lg border border-white bg-white/20 px-4 py-2 transition hover:bg-white/50"
			href="/"
			data-sveltekit-reload
		>
			Explore a different dataset
		</a>
	</header>

	{@render children()}
</div>
