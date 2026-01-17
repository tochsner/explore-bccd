export type Histogram = {
	bucketStart: number;
	bucketEnd: number;
	normalizedDensity: number;
}[];

const NUM_BUCKETS = 16;

/**
 * Creates a histogram from the given weighted samples.
 * @param a list of samples and their weight.
 * @returns a list of the bucket normalized densities.
 */
export function getHistogram(samples: [number, number][]) {
	if (!samples.length) {
		return [];
	}

	// Sort samples by their value, disregarding the weight
	const sortedSamples = [...samples].sort((a, b) => a[0] - b[0]);

	// exclude 0.05% lowest, 0.05% highest (i.e., 99.9% central mass) based only on sample values
	const lowerIdx = Math.floor(sortedSamples.length * 0.0005);
	const upperIdx = Math.ceil(sortedSamples.length * 0.9995) - 1; // inclusive

	const min = sortedSamples[lowerIdx][0];
	const max = sortedSamples[upperIdx][0];

	if (min === max) {
		// all selected values are the same, one bucket
		return [
			{
				bucketStart: min,
				bucketEnd: max,
				normalizedDensity: 1
			}
		];
	}

	const bucketWidth = (max - min) / NUM_BUCKETS;

	// build buckets: store total weight in each bucket
	const buckets = Array(NUM_BUCKETS).fill(0);
	let totalWeight = 0;

	// only include values within [min, max]
	for (let i = lowerIdx; i <= upperIdx; i++) {
		const [x, weight] = sortedSamples[i];
		if (x < min || x > max) continue; // just in case

		let idx = Math.floor((x - min) / bucketWidth);
		if (idx === NUM_BUCKETS) idx = NUM_BUCKETS - 1; // edge case: x === max
		buckets[idx] += weight;
		totalWeight += weight;
	}

	// convert to { bucketStart, bucketEnd, normalizedDensity }
	const histogram = buckets.map((bucketWeight, i) => {
		const bucketStart = min + i * bucketWidth;
		const bucketEnd = i === NUM_BUCKETS - 1 ? max : bucketStart + bucketWidth;

		const normalizedDensity = totalWeight > 0 ? bucketWeight / totalWeight : 0;
		return { bucketStart, bucketEnd, normalizedDensity };
	});

	return histogram;
}
