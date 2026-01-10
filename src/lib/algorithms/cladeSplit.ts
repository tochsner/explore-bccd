import type { Clade } from './clade';

export type CladeSplit = {
	fingerprint: number;
	parent: Clade;
	clade1: Clade;
	clade2: Clade;
};

export function buildCladeSplit(parent: Clade, clade1: Clade, clade2: Clade) {
	const minFingerprint = Math.min(clade1.fingerprint, clade2.fingerprint);
	const maxFingerprint = Math.max(clade1.fingerprint, clade2.fingerprint);
	const fingerprint = minFingerprint ^ Math.imul(maxFingerprint, 0x9e3779b1);

	return {
		fingerprint,
		parent,
		clade1,
		clade2
	};
}
