// input message types

import type { TreeToDraw } from '$lib/algorithms/treeToDraw';

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

export type TreeWorkerMessage =
	| ParsePosteriorTreesMessage
	| ParseSummaryTreeMessage
	| BuildBCCDMessage;

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

export type BuiltBCCDResponse2 = {
	success: true;
	map: unknown;
};

export type TreeWorkerResponse =
	| SuccessResponse
	| ErrorResponse
	| BuiltBCCDResponse
	| BuiltBCCDResponse2;
