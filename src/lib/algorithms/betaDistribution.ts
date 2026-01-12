import digamma from '@stdlib/math/base/special/digamma';
import mean from '@stdlib/stats/base/mean';
import variance from '@stdlib/stats/base/variance';
import { logpdf } from '@stdlib/stats/base/dists/beta';
import { beta as sampleBeta } from '@stdlib/random/base';
import { nelderMead } from 'fmin';

export type BetaParameters = {
	alpha: number;
	beta: number;
};

export function betaLogDensity(x: number, { alpha, beta }: BetaParameters) {
	return logpdf(x, alpha, beta);
}

export function betaPointEstimate({ alpha, beta }: BetaParameters) {
	return alpha / (alpha + beta);
}

export function betaSample({ alpha, beta }: BetaParameters) {
	return sampleBeta(alpha, beta);
}

/**
 * Fits beta distribution parameters using Maximum Likelihood Estimation.
 *
 * Implements the exact MLE algorithm presented in:
 * Beckman, R. J., & Tietjen, G. L. (1978).
 * Maximum likelihood estimation for the beta distribution.
 * Journal of Statistical Computation and Simulation, 7(3–4), 253–258.
 * https://doi.org/10.1080/00949657808810232
 */
export function betaMLE(observations: number[]): BetaParameters {
	const n = observations.length;

	// logG1: mean of log(observations)
	const logG1 =
		observations.map((x) => Math.log(Math.max(1e-10, x))).reduce((sum, val) => sum + val, 0) / n;

	// logG2: mean of log(1-observations)
	const logG2 =
		observations.map((x) => Math.log(Math.max(1e-10, 1.0 - x))).reduce((sum, val) => sum + val, 0) /
		n;

	const objectiveFunction = ([beta]: number[]): number => {
		const term1 = digamma(beta);
		const term2 = inverseDigamma(logG1 - logG2 + digamma(beta));
		const term3 = digamma(term2 + beta);
		const result = term1 - term3 - logG2;
		return result * result; // minimize squared error
	};

	// solve for beta

	const initialGuess = estimateBetaWithMoM(observations);

	const solution = nelderMead(objectiveFunction, [initialGuess]);
	const beta = solution.x[0];

	// calculate alpha

	const alpha = inverseDigamma(logG1 - logG2 + digamma(beta));

	return { alpha, beta };
}

/**
 * Estimates the beta parameter using a method-of-moments approach.
 */
function estimateBetaWithMoM(observations: number[]): number {
	const n = observations.length;
	const m = mean(n, observations, 1);
	const v = variance(n, 1, observations, 1);

	if (v >= m * (1 - m)) {
		throw new Error('Beta parameters could not be estimated: variance too large');
	}

	const beta = (1 - m) * ((m * (1 - m)) / v - 1);

	if (beta <= 0) {
		throw new Error('Beta parameters could not be estimated: computed beta is non-positive');
	}

	return beta;
}

/**
 * Computes the inverse of the digamma function.
 * Solves digamma(v) - y = 0 for v.
 */
function inverseDigamma(y: number): number {
	// objective function: digamma(v) - y
	const objective = ([v]: number[]): number => {
		const result = digamma(v) - y;
		return result * result; // minimize squared error
	};

	// 	Initial guess based on:
	//  Batir, N. Inequalities for the inverses of the polygamma functions.
	//  Arch. Math. 110, 581–589 (2018).
	//  https://doi.org/10.1007/s00013-018-1156-2
	const initialGuess = Math.max(1 / Math.log(1 + Math.exp(-y)), 1e-10);

	// use Nelder-Mead to minimize the squared error
	const solution = nelderMead(objective, [initialGuess]);

	return solution.x[0];
}
