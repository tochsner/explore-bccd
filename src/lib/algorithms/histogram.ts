export type HistogramBucket = {
	bucketStart: number;
	bucketEnd: number;
	normalizedDensity: number;
};

export type Histogram = {
	buckets: HistogramBucket[];
	mean: number;
	credibleInterval: { lower: number; upper: number };
};

const NUM_BUCKETS = 16;

/**
 * Finds the weighted percentile value from sorted samples.
 */
function getWeightedPercentile(
	sortedSamples: [number, number][],
	totalWeight: number,
	percentile: number
): number {
	const targetWeight = totalWeight * percentile;
	let cumulativeWeight = 0;

	for (const [value, weight] of sortedSamples) {
		cumulativeWeight += weight;
		if (cumulativeWeight >= targetWeight) {
			return value;
		}
	}

	return sortedSamples[sortedSamples.length - 1][0];
}

/**
 * Creates a histogram from the given weighted samples.
 * @param samples A list of samples and their weight.
 * @returns Histogram with buckets, mean, and 95% credible interval.
 */
export function getHistogram(samples: [number, number][]): Histogram | null {
	if (!samples.length) {
		return null;
	}

	// sort samples by their value, disregarding the weight
	const sortedSamples = [...samples].sort((a, b) => a[0] - b[0]);

	// calculate total weight and weighted mean
	let totalWeight = 0;
	let weightedSum = 0;
	for (const [value, weight] of sortedSamples) {
		totalWeight += weight;
		weightedSum += value * weight;
	}
	const mean = weightedSum / totalWeight;

	// calculate 95% credible interval (2.5th to 97.5th percentile)
	const lower = getWeightedPercentile(sortedSamples, totalWeight, 0.025);
	const upper = getWeightedPercentile(sortedSamples, totalWeight, 0.975);

	// exclude 0.05% lowest, 0.05% highest (i.e., 99.9% central mass) for histogram display
	const lowerIdx = Math.floor(sortedSamples.length * 0.0005);
	const upperIdx = Math.ceil(sortedSamples.length * 0.9995) - 1; // inclusive

	const min = sortedSamples[lowerIdx][0];
	const max = sortedSamples[upperIdx][0];

	if (min === max) {
		// all selected values are the same, one bucket
		return {
			buckets: [
				{
					bucketStart: min,
					bucketEnd: max,
					normalizedDensity: 1
				}
			],
			mean,
			credibleInterval: { lower, upper }
		};
	}

	const bucketWidth = (max - min) / NUM_BUCKETS;

	// build buckets: store total weight in each bucket
	const bucketWeights = Array(NUM_BUCKETS).fill(0);
	let bucketTotalWeight = 0;

	// only include values within [min, max] for histogram display
	for (let i = lowerIdx; i <= upperIdx; i++) {
		const [x, weight] = sortedSamples[i];
		if (x < min || x > max) continue; // just in case

		let idx = Math.floor((x - min) / bucketWidth);
		if (idx === NUM_BUCKETS) idx = NUM_BUCKETS - 1; // edge case: x === max
		bucketWeights[idx] += weight;
		bucketTotalWeight += weight;
	}

	// convert to bucket objects
	const buckets = bucketWeights.map((bucketWeight, i) => {
		const bucketStart = min + i * bucketWidth;
		const bucketEnd = i === NUM_BUCKETS - 1 ? max : bucketStart + bucketWidth;

		const normalizedDensity = bucketTotalWeight > 0 ? bucketWeight / bucketTotalWeight : 0;
		return { bucketStart, bucketEnd, normalizedDensity };
	});

	return {
		buckets,
		mean,
		credibleInterval: { lower, upper }
	};
}
