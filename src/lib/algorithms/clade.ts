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

export function isLeaf(clade: Clade) {
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
