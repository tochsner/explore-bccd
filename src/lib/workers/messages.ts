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

type GetPotentialSplitsMessages = {
	type: 'getPotentialSplits';
	nodeNr: number;
};

export type TreeWorkerMessage =
	| ParsePosteriorTreesMessage
	| ParseSummaryTreeMessage
	| BuildBCCDMessage
	| GetPotentialSplitsMessages;

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

export type GetPotentialSplitsResponse = {
	success: true;
	splits: {
		leftLabels: string[];
		rightLabels: string[];
		logDensity: number;
	}[];
};

export type TreeWorkerResponse =
	| SuccessResponse
	| ErrorResponse
	| BuiltBCCDResponse
	| GetPotentialSplitsResponse;
