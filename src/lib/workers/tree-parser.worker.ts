import { readTreesFromNexus, readNexus, Tree } from 'phylojs';
import { BCCD } from '$lib/algorithms/bccd';
import type { ErrorResponse, TreeWorkerMessage, TreeWorkerResponse } from './messages';
import { BCCDPointEstimator } from '$lib/algorithms/pointEstimate';
import { translateLabels } from '$lib/algorithms/treeUtils';

class WorkerAPI {
	private posteriorTrees: Tree[] | null = null;
	private summaryTree: Tree | null = null;
	private bccd: BCCD | null = null;
	private pointEstimate: BCCDPointEstimator | null = null;

	handleMessage(message: TreeWorkerMessage): TreeWorkerResponse {
		try {
			switch (message.type) {
				case 'parsePosteriorTrees':
					return this.parsePosteriorTrees(message.content);

				case 'parseSummaryTree':
					return this.parseSummaryTree(message.content);

				case 'buildBCCD':
					return this.buildBCCD();

				case 'getNodeDetails':
					return this.getNodeDetails(message.nodeNr);

				case 'conditionOnSplit':
					return this.conditionOnSplit(message.nodeNr, message.splitFingerprint);

				case 'removeConditioningOnSplit':
					return this.removeConditioningOnSplit(message.cladeFingerprint);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return { success: false, error: message };
		}
	}

	private parsePosteriorTrees(content: string): TreeWorkerResponse {
		this.posteriorTrees = readTreesFromNexus(content);
		this.posteriorTrees.forEach((tree) => tree.computeNodeHeights());
		translateLabels(this.posteriorTrees, content);
		return { success: true };
	}

	private parseSummaryTree(content: string): TreeWorkerResponse {
		this.summaryTree = readNexus(content);
		this.summaryTree.computeNodeHeights();
		return { success: true };
	}

	private buildBCCD(): TreeWorkerResponse {
		if (!this.posteriorTrees) {
			return { success: false, error: 'Parse the posterior trees before building the BCCD.' };
		}

		this.bccd = new BCCD(this.posteriorTrees);
		this.pointEstimate = new BCCDPointEstimator(this.bccd);

		return { success: true, pointEstimate: this.pointEstimate.pointEstimate };
	}

	private getNodeDetails(nodeNr: number): TreeWorkerResponse {
		return { success: true, details: this.pointEstimate?.getNodeDetails(nodeNr) };
	}

	private conditionOnSplit(nodeNr: number, splitFingerprint: number): TreeWorkerResponse {
		if (!this.pointEstimate) {
			return { success: false, error: 'Build the BCCD before conditioning on a split.' };
		}

		this.pointEstimate.conditionOnSplit(nodeNr, splitFingerprint);

		return { success: true, pointEstimate: this.pointEstimate.pointEstimate };
	}

	private removeConditioningOnSplit(cladeFingerprint: number): TreeWorkerResponse {
		if (!this.pointEstimate) {
			return { success: false, error: 'Build the BCCD before removing conditioning.' };
		}

		this.pointEstimate.removeConditioningOnSplit(cladeFingerprint);

		return { success: true, pointEstimate: this.pointEstimate.pointEstimate };
	}
}

const api = new WorkerAPI();

self.onmessage = (event: MessageEvent<TreeWorkerMessage>) => {
	const response = api.handleMessage(event.data);
	self.postMessage(response);
};

export function sendMessage<E extends TreeWorkerResponse>(
	message: TreeWorkerMessage,
	worker: Worker
): Promise<E> {
	return new Promise<E>((resolve, reject) => {
		const handler = (e: MessageEvent<E | ErrorResponse>) => {
			if (e.data.success) {
				resolve(e.data as E);
			} else {
				reject(e.data);
			}
			worker.removeEventListener('message', handler);
		};
		worker.addEventListener('message', handler);
		worker.postMessage(message);
	});
}
