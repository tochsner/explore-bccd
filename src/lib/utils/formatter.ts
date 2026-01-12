export function formatNumber(x: number) {
	const ax = Math.abs(x);

	// Keep large numbers as-is
	if (ax >= 100) return String(x);

	// Force scientific notation for very small numbers
	if (ax > 0 && ax < 1e-3) {
		return x.toExponential(1).replace('+', '');
	}

	// Otherwise, keep at least 2 significant digits
	return Number(x.toPrecision(2)).toString();
}
