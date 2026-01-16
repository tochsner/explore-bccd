import type {
	ConditionedHeight,
	ConditionedSplit,
	NodeDetails,
	TreeToDraw
} from '$lib/algorithms/treeToDraw';
import type { GetGlobalStateResponse } from '$lib/workers/messages';
import { sendMessage } from '$lib/workers/tree-parser.worker';

export function createGlobalState() {
	let pointEstimate = $state<TreeToDraw>();
	let conditionedSplits = $state<ConditionedSplit[]>();
	let conditionedHeights = $state<ConditionedHeight[]>();
	let selectedNodeDetails = $state<NodeDetails>();
	let hoveredNodeNr = $state<number>();

	return {
		getGlobalState() {
			return {
				pointEstimate,
				conditionedSplits,
				conditionedHeights,
				selectedNodeDetails,
				hoveredNodeNr
			};
		},
		getConditionedSplits() {
			return conditionedSplits;
		},
		getConditionedHeights() {
			return conditionedHeights;
		},
		getSelectedNodeDetails() {
			return selectedNodeDetails;
		},
		setSelectedNodeNr(value?: number, worker?: Worker) {
			if (value === undefined) {
				selectedNodeDetails = undefined;
				return;
			} else if (!!worker) {
				this.synchronizeStateWithWorker(worker, value);
			}
		},
		setHoveredNodeNr(value: number | undefined) {
			hoveredNodeNr = value;
		},
		async synchronizeStateWithWorker(worker: Worker, selectedNodeNr?: number) {
			const response = await sendMessage<GetGlobalStateResponse>(
				{
					type: 'getGlobalStateMessage',
					selectedNodeNr: selectedNodeNr || selectedNodeDetails?.nodeNr
				},
				worker
			);
			if (response.success) {
				pointEstimate = response.pointEstimate;
				selectedNodeDetails = response.selectedNodeDetails;
				conditionedSplits = response.conditionedSplits;
				conditionedHeights = response.conditionedHeights;
			}
		}
	};
}

export type GlobalState = ReturnType<typeof createGlobalState>;
export type GlobalStateObject = ReturnType<ReturnType<typeof createGlobalState>['getGlobalState']>;
