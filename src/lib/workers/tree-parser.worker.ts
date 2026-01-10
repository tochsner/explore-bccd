import { readTreesFromNexus, readNexus, Tree } from 'phylojs';
import { BCCD } from '$lib/algorithms/bccd';
import type { TreeWorkerMessage, TreeWorkerResponse } from './messages';

class WorkerAPI {
	private posteriorTrees: Tree[] | null = null;
	private summaryTree: Tree | null = null;
	private bccd: BCCD | null = null;

	handleMessage(message: TreeWorkerMessage): TreeWorkerResponse {
		try {
			switch (message.type) {
				case 'parsePosteriorTrees':
					return this.parsePosteriorTrees(message.content);

				case 'parseSummaryTree':
					return this.parseSummaryTree(message.content);

				case 'buildBCCD':
					return this.buildBCCD();

				case 'getBCCD':
					return this.getBCCD();

				case 'getSummaryTree':
					return this.getSummaryTree();
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return { success: false, error: message };
		}
	}

	private parsePosteriorTrees(content: string): TreeWorkerResponse {
		this.posteriorTrees = readTreesFromNexus(content);
		return { success: true };
	}

	private parseSummaryTree(content: string): TreeWorkerResponse {
		this.summaryTree = readNexus(content);
		return { success: true };
	}

	private buildBCCD(): TreeWorkerResponse {
		if (!this.posteriorTrees) {
			return { success: false, error: 'Parse the posterior trees before building the BCCD.' };
		}

		this.bccd = new BCCD(this.posteriorTrees);
		return { success: true };
	}

	private getBCCD(): TreeWorkerResponse {
		if (!this.bccd) {
			return { success: false, error: 'BCCD has not been built yet.' };
		}
		return { success: true, bccd: this.bccd };
	}

	private getSummaryTree(): TreeWorkerResponse {
		if (!this.summaryTree) {
			return { success: false, error: 'Summary tree has not been loaded yet.' };
		}
		return { success: true, summaryTree: this.summaryTree };
	}
}

const api = new WorkerAPI();

self.onmessage = (event: MessageEvent<TreeWorkerMessage>) => {
	const response = api.handleMessage(event.data);
	self.postMessage(response);
};
