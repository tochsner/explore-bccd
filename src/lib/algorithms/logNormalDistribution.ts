import { logpdf } from '@stdlib/stats/base/dists/lognormal';
import mean from '@stdlib/stats/base/mean';
import stdev from '@stdlib/stats/base/stdev';
import { lognormal as sampleLogNormal } from '@stdlib/random/base';

export type LogNormalParameters = {
	mu: number;
	sigma: number;
};

export function logNormalLogDensity(x: number, { mu, sigma }: LogNormalParameters) {
	return logpdf(x, mu, sigma);
}

export function logNormalPointEstimate(parameters: LogNormalParameters) {
	return Math.exp(parameters.mu - parameters.sigma * parameters.sigma);
}

export function logNormalSample(parameters: LogNormalParameters) {
	return sampleLogNormal(parameters.mu, parameters.sigma);
}

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
	const logObservations = observations.map((x) => Math.log(Math.max(1e-10, x)));

	// MLE for mu: mean of log-transformed observations
	const mu = mean(n, logObservations, 1);

	// MLE for sigma: standard deviation of log-transformed observations
	const sigma = stdev(n, 1, logObservations, 1);

	return { mu, sigma };
}
