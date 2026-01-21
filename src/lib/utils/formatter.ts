export function formatNumber(x: number, significantDigits: number = 2) {
	const ax = Math.abs(x);

	// keep large numbers as-is
	if (ax >= 100) return String(Math.round(x));

	// force scientific notation for very small numbers
	if (ax > 0 && ax < 1e-3) {
		return x.toExponential(Math.max(1, significantDigits - 1)).replace('+', '');
	}

	// otherwise, use specified significant digits
	return Number(x.toPrecision(significantDigits)).toString();
}
