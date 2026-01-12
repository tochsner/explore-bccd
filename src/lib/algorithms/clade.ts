import type { BCCD } from './bccd';

export type Clade = {
	fingerprint: number;
	size: number;
	totalNumTips: number;
};

export type Leaf = Clade & {
	size: 1;
	label: string;
};

export function fingerprint(clade: Clade) {
	return clade.fingerprint;
}

export function isRoot(clade: Clade) {
	return clade.size === clade.totalNumTips;
}

export function isLeaf(clade: Clade): clade is Leaf {
	return clade.size === 1;
}

export function union(clade1: Clade, clade2: Clade): Clade {
	return {
		fingerprint: clade1.fingerprint ^ clade2.fingerprint,
		size: clade1.size + clade2.size,
		totalNumTips: clade1.totalNumTips
	};
}

export function size(clade: Clade) {
	return clade.size;
}

export function getLeafNames(bccd: BCCD, clade: Clade) {
	const leafNames: string[] = [];
	collectLeafNames(bccd, clade, leafNames);
	return leafNames;
}

function collectLeafNames(bccd: BCCD, clade: Clade, leafNames: string[]) {
	if ('label' in clade && clade.size === 1) {
		// clade is a Leaf
		leafNames.push((clade as Leaf).label);
		return;
	}

	const splitFingerprint = bccd.splitsPerClade.get(clade.fingerprint)?.values().next().value;
	if (!splitFingerprint) return;

	const split = bccd.splits.get(splitFingerprint);
	if (!split) return;

	const clade1 = bccd.clades.get(split.clade1.fingerprint);
	const clade2 = bccd.clades.get(split.clade2.fingerprint);

	if (!clade1 || !clade2) return;

	collectLeafNames(bccd, clade1, leafNames);
	collectLeafNames(bccd, clade2, leafNames);
}
