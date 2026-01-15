import { readTreesFromNexus, Tree } from 'phylojs';
import { BCCD } from '$lib/algorithms/bccd';
import type { TreeWorkerMessage, TreeWorkerResponse } from './messages';
import { BCCDPointEstimator } from '$lib/algorithms/pointEstimate';
import { translateLabels } from '$lib/algorithms/treeUtils';

class WorkerAPI {
	private posteriorTrees: Tree[] | null = null;
	private bccd: BCCD | null = null;
	private pointEstimator: BCCDPointEstimator | null = null;

	handleMessage(message: TreeWorkerMessage): TreeWorkerResponse {
		try {
			switch (message.type) {
				case 'getGlobalStateMessage':
					return { id: message.id, ...this.getGlobalState(message.selectedNodeNr) };

				case 'parsePosteriorTrees':
					this.parsePosteriorTrees(message.content);
					break;

				case 'buildBCCD':
					this.buildBCCD();
					break;

				case 'conditionOnSplit':
					this.conditionOnSplit(message.nodeNr, message.splitFingerprint);
					break;

				case 'removeConditioningOnSplit':
					this.removeConditioningOnSplit(message.cladeFingerprint);
					break;
			}

			return { success: true, id: message.id };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return { success: false, error: message };
		}
	}

	getGlobalState(selectedNodeNr?: number) {
		return {
			success: true as const,
			pointEstimate: this.pointEstimator?.pointEstimate,
			conditionedSplits: this.pointEstimator?.getConditionedSplits(),
			selectedNodeDetails: !!selectedNodeNr
				? this.pointEstimator?.getNodeDetails(selectedNodeNr)
				: undefined
		};
	}

	private parsePosteriorTrees(content: string) {
		this.posteriorTrees = readTreesFromNexus(content);
		this.posteriorTrees.forEach((tree) => tree.computeNodeHeights());
		translateLabels(this.posteriorTrees, content);
	}

	private buildBCCD() {
		if (!this.posteriorTrees) {
			return { success: false, error: 'Parse the posterior trees before building the BCCD.' };
		}

		this.bccd = new BCCD(this.posteriorTrees);
		this.pointEstimator = new BCCDPointEstimator(this.bccd);
	}

	private conditionOnSplit(nodeNr: number, splitFingerprint: number) {
		if (!this.pointEstimator) {
			return { success: false, error: 'Build the BCCD before conditioning on a split.' };
		}
		this.pointEstimator.conditionOnSplit(nodeNr, splitFingerprint);
	}

	private removeConditioningOnSplit(cladeFingerprint: number) {
		if (!this.pointEstimator) {
			return { success: false, error: 'Build the BCCD before removing conditioning.' };
		}
		this.pointEstimator.removeConditioningOnSplit(cladeFingerprint);
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
	const id = Math.random();
	return new Promise<E>((resolve, reject) => {
		const handler = (e: MessageEvent<E>) => {
			if (e.data.id !== id) return;

			if (e.data.success) {
				resolve(e.data as E);
			} else {
				reject(e.data);
			}
			worker.removeEventListener('message', handler);
		};
		worker.addEventListener('message', handler);
		worker.postMessage({ ...message, id });
	});
}
