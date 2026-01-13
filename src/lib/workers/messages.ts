// input message types

import type { NodeDetails, TreeToDraw, ConditionedSplit } from '$lib/algorithms/treeToDraw';

type ParsePosteriorTreesMessage = {
	type: 'parsePosteriorTrees';
	content: string;
};

type BuildBCCDMessage = {
	type: 'buildBCCD';
};

type ConditionOnSplitMessage = {
	type: 'conditionOnSplit';
	nodeNr: number;
	splitFingerprint: number;
};

type RemoveConditioningOnSplitMessage = {
	type: 'removeConditioningOnSplit';
	cladeFingerprint: number;
};

type GetGlobalStateMessage = {
	type: 'getGlobalStateMessage';
	selectedNodeNr?: number;
};

export type TreeWorkerMessage = (
	| ParsePosteriorTreesMessage
	| BuildBCCDMessage
	| ConditionOnSplitMessage
	| RemoveConditioningOnSplitMessage
	| GetGlobalStateMessage
) & {
	id?: number;
};
// output message types

export type SuccessResponse = {
	success: true;
};

export type ErrorResponse = {
	success: false;
	error: string;
};

export type GetGlobalStateResponse = {
	success: true;
	pointEstimate: TreeToDraw | undefined;
	conditionedSplits: ConditionedSplit[] | undefined;
	selectedNodeDetails: NodeDetails | undefined;
};

export type TreeWorkerResponse = (SuccessResponse | ErrorResponse | GetGlobalStateResponse) & {
	id?: number;
};
