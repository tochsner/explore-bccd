export type Histogram = {
	bucketStart: number;
	bucketEnd: number;
	normalizedDensity: number;
}[];

const NUM_BUCKETS = 20;

export function getHistogram(samples: number[]) {
	if (!samples.length) {
		return [];
	}

	const sorted = [...samples].sort((a, b) => a - b);

	// exclude 0.5% lowest, 0.5% highest (i.e., 99% central mass)
	const lowerIdx = Math.floor(sorted.length * 0.005);
	const upperIdx = Math.ceil(sorted.length * 0.995) - 1; // inclusive

	const min = sorted[lowerIdx];
	const max = sorted[upperIdx];

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

	// build buckets
	const buckets = Array(NUM_BUCKETS).fill(0);
	let total = 0;

	// only include values within [min, max]
	for (let i = lowerIdx; i <= upperIdx; i++) {
		const x = sorted[i];
		let idx = Math.floor((x - min) / bucketWidth);
		if (idx === NUM_BUCKETS) idx = NUM_BUCKETS - 1; // edge case: x === max
		buckets[idx]++;
		total++;
	}

	// convert to { bucketStart, bucketEnd, normalizedDensity }
	const histogram = buckets.map((count, i) => {
		const bucketStart = min + i * bucketWidth;
		const bucketEnd = i === NUM_BUCKETS - 1 ? max : bucketStart + bucketWidth;

		// normalizedDensity: sum of all densities = 1
		const normalizedDensity = count / total;
		return { bucketStart, bucketEnd, normalizedDensity };
	});

	return histogram;
}
