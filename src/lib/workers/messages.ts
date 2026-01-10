// input message types

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

export type TreeWorkerResponse = SuccessResponse | ErrorResponse;
