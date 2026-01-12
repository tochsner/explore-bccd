export function formatNumber(n: number) {
	const abs = Math.abs(n);

	if (abs >= 1e6 || (abs > 0 && abs < 1e-3)) {
		return n.toExponential(1); // no decimal mantissa
	}

	return n.toFixed(1);
}
