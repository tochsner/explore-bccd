export type Histogram = {
	bucketStart: number;
	bucketEnd: number;
	normalizedDensity: number;
}[];

const NUM_BUCKETS = 25;

export function getHistogram(samples: number[]) {
	if (!samples.length) {
		return [];
	}

	// find min and max values
	const min = Math.min(...samples);
	const max = Math.max(...samples);

	if (min === max) {
		// all values are the same, one bucket
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

	for (const x of samples) {
		let idx = Math.floor((x - min) / bucketWidth);
		if (idx === NUM_BUCKETS) idx = NUM_BUCKETS - 1; // edge case: max value
		buckets[idx]++;
	}

	const total = samples.length;

	// convert to { bucketStart, bucketEnd, normalizedDensity }
	const histogram = buckets.map((count, i) => {
		const bucketStart = min + i * bucketWidth;
		const bucketEnd = i === NUM_BUCKETS - 1 ? max : bucketStart + bucketWidth;

		// normalizedDensity: sum of all densities = 1
		const normalizedDensity = count / total / (bucketEnd - bucketStart);
		return { bucketStart, bucketEnd, normalizedDensity };
	});

	return histogram;
}
