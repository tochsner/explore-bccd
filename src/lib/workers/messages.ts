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

type GetBCCDMessage = {
	type: 'getBCCD';
};

type GetSummaryTreeMessage = {
	type: 'getSummaryTree';
};

export type TreeWorkerMessage =
	| ParsePosteriorTreesMessage
	| ParseSummaryTreeMessage
	| BuildBCCDMessage
	| GetBCCDMessage
	| GetSummaryTreeMessage;

// output message types

export type SuccessResponse = {
	success: true;
};

export type BCCDResponse = {
	success: true;
	bccd: any;
};

export type SummaryTreeResponse = {
	success: true;
	summaryTree: any;
};

export type ErrorResponse = {
	success: false;
	error: string;
};

export type TreeWorkerResponse =
	| SuccessResponse
	| BCCDResponse
	| SummaryTreeResponse
	| ErrorResponse;