import { readTreesFromNexus, readNexus, Tree } from 'phylojs';
import { BCCD } from '$lib/algorithms/bccd';
import type { TreeWorkerMessage, TreeWorkerResponse } from './messages';
import { BCCDPointEstimator } from '$lib/algorithms/pointEstimate';
import type { TreeToDraw } from '$lib/algorithms/treeToDraw';
import { translateLabels } from '$lib/algorithms/treeUtils';

class WorkerAPI {
	private posteriorTrees: Tree[] | null = null;
	private summaryTree: Tree | null = null;
	private bccd: BCCD | null = null;
	private pointEstimate: TreeToDraw | null = null;

	handleMessage(message: TreeWorkerMessage): TreeWorkerResponse {
		try {
			switch (message.type) {
				case 'parsePosteriorTrees':
					return this.parsePosteriorTrees(message.content);

				case 'parseSummaryTree':
					return this.parseSummaryTree(message.content);

				case 'buildBCCD':
					return this.buildBCCD();
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
		this.pointEstimate = new BCCDPointEstimator(this.bccd).buildPointEstimate();

		return { success: true, pointEstimate: this.pointEstimate };
	}
}

const api = new WorkerAPI();

self.onmessage = (event: MessageEvent<TreeWorkerMessage>) => {
	const response = api.handleMessage(event.data);
	self.postMessage(response);
};
