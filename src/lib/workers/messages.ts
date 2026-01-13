// input message types

import type { NodeDetails, PossibleSplit, TreeToDraw } from '$lib/algorithms/treeToDraw';

type ParsePosteriorTreesMessage = {
	type: 'parsePosteriorTrees';
	content: string;
};

type ParseSummaryTreeMessage = {
	type: 'parseSummaryTree';
	content: string;
};

type BuildBCCDMessage = {
	type: 'buildBCCD';
};

type GetNodeDetailsMessages = {
	type: 'getNodeDetails';
	nodeNr: number;
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

export type TreeWorkerMessage =
	| ParsePosteriorTreesMessage
	| ParseSummaryTreeMessage
	| BuildBCCDMessage
	| GetNodeDetailsMessages
	| ConditionOnSplitMessage
	| RemoveConditioningOnSplitMessage;

// output message types

export type SuccessResponse = {
	success: true;
};

export type ErrorResponse = {
	success: false;
	error: string;
};

export type BuiltBCCDResponse = {
	success: true;
	pointEstimate: TreeToDraw;
};

export type GetNodeDetailsResponse = {
	success: true;
	details: NodeDetails;
};

export type UpdatedPointEstimateResponse = {
	success: true;
	pointEstimate: TreeToDraw;
};

export type TreeWorkerResponse =
	| SuccessResponse
	| ErrorResponse
	| BuiltBCCDResponse
	| GetNodeDetailsResponse
	| UpdatedPointEstimateResponse;
