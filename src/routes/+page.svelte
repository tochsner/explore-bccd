<script lang="ts">
	import { onMount } from 'svelte';
	import FileUploadSection from '$lib/components/FileUploadSection.svelte';
	import BuildBCCD from '$lib/components/BuildBCCD.svelte';
	import TreeVisualization from '$lib/components/TreeVisualization.svelte';
	import TreeParserWorker from '$lib/workers/tree-parser.worker?worker';
	import type { TreeToDraw } from '$lib/algorithms/treeToDraw';
	import { getHistogram } from '$lib/algorithms/histogram';

	let worker: Worker | undefined = $state();
	let posteriorTreesLoaded = $state(false);
	let bccdBuilt = $state(false);

	let pointEstimateNewick = $state('');

	let stage = $derived.by(() => {
		return 'explore';
		if (!posteriorTreesLoaded) return 'loadTrees';
		else if (!bccdBuilt) return 'buildModel';
		else return 'explore';
	});

	onMount(() => {
		worker = new TreeParserWorker();
		return () => {
			worker?.terminate();
		};
	});

	function getRandomHistogram(mean: number) {
		// Generate an array of random variables around the given mean with some random spread
		// For demonstration, use a normal distribution (with fixed stddev)
		function randn_bm() {
			// Box-Muller transform
			let u = 0,
				v = 0;
			while (u === 0) u = Math.random();
			while (v === 0) v = Math.random();
			return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
		}

		const sampleCount = 200;
		const stddev = 0.25;
		const samples = Array.from({ length: sampleCount }, () =>
			Math.max(mean + randn_bm() * stddev, 0)
		);

		return getHistogram(samples);
	}

	const treeToDraw: TreeToDraw = {
		// Newick for this tree: (Humans:10.0,((Apes:3.0,Giraffe:3.0):5.0,Cats:2.0):8.0);

		root: {
			type: 'internal',
			nr: 0,
			height: 7,
			heightDistribution: getRandomHistogram(7),
			left: {
				type: 'internal',
				nr: 1,
				height: 2,
				heightDistribution: getRandomHistogram(2),
				left: {
					type: 'leaf',
					nr: 2,
					height: 0.5,
					label: 'Humanmamamamama'
				},
				right: {
					type: 'internal',
					nr: 3,
					height: 1,
					heightDistribution: getRandomHistogram(1),
					left: {
						type: 'leaf',
						nr: 4,
						height: 0,
						label: 'B'
					},
					right: {
						type: 'leaf',
						nr: 5,
						height: 0,
						label: 'C'
					}
				}
			},
			right: {
				type: 'internal',
				nr: 6,
				height: 2.5,
				heightDistribution: getRandomHistogram(2.5),
				left: {
					type: 'internal',
					nr: 7,
					height: 0.5,
					heightDistribution: getRandomHistogram(0.5),
					left: {
						type: 'leaf',
						nr: 8,
						height: 0,
						label: 'Apeapeapeapeapeapeape'
					},
					right: {
						type: 'leaf',
						nr: 9,
						height: 0,
						label: 'E'
					}
				},
				right: {
					type: 'internal',
					nr: 10,
					height: 1,
					heightDistribution: getRandomHistogram(1),
					left: {
						type: 'leaf',
						nr: 11,
						height: 0,
						label: 'F'
					},
					right: {
						type: 'leaf',
						nr: 12,
						height: 0,
						label: 'G'
					}
				}
			}
		}
	};
</script>

{#if worker}
	{#if stage == 'loadTrees'}
		<div class="mx-auto w-full max-w-[900px] px-6 py-20">
			<p
				class="text-dark text-center text-xl leading-normal font-extrabold sm:text-4xl md:text-5xl md:leading-tight"
			>
				Explore your <span class="text-accent">phylogenetic posterior tree</span> distribution
			</p>
		</div>

		<FileUploadSection {worker} bind:posteriorTreesLoaded />
	{:else if stage == 'buildModel'}
		<BuildBCCD {worker} bind:bccdBuilt bind:pointEstimateNewick />
	{:else if stage == 'explore'}
		<div class="flex h-full w-full flex-1 flex-col py-6 pb-8">
			<TreeVisualization {treeToDraw} />
		</div>
	{/if}
{/if}
