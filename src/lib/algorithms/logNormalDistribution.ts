import mean from '@stdlib/stats/base/mean';
import stdev from '@stdlib/stats/base/stdev';

export type LogNormalParameters = {
	mu: number;
	sigma: number;
};

/**
 * Fits log-normal distribution parameters using Maximum Likelihood Estimation.
 *
 * For a log-normal distribution, if X ~ LogNormal(μ, σ²), then log(X) ~ Normal(μ, σ²).
 * The MLEs have closed-form solutions:
 * - μ̂ = mean(log(observations))
 * - σ̂ = stdev(log(observations))
 */
export function logNormalMLE(observations: number[]): LogNormalParameters {
	const n = observations.length;

	// transform observations to log-space
	const logObservations = observations.map(x => Math.log(Math.max(1e-10, x)));

	// MLE for mu: mean of log-transformed observations
	const mu = mean(n, logObservations, 1);

	// MLE for sigma: standard deviation of log-transformed observations
	const sigma = stdev(n, 1, logObservations, 1);

	return { mu, sigma };
}
