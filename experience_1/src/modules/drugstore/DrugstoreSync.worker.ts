import { applicationConfig } from "../../config";
import { DrugstoreService } from "./Drugstore.service";

let timer: NodeJS.Timeout | null = null;
let running = false;

const runCycle = async () => {
	if (running) return;
	running = true;
	try {
		await DrugstoreService.processPendingSyncEvents();
	} catch (error) {
		console.error("[DrugstoreSyncWorker] sync cycle failed", error);
	} finally {
		running = false;
	}
};

export const startDrugstoreSyncWorker = () => {
	if (timer) return;

	const enabled = applicationConfig.merchantIntegration?.syncWorker?.enabled !== false;
	if (!enabled) return;

	const interval = applicationConfig.merchantIntegration?.syncWorker?.pollIntervalMs || 15000;
	timer = setInterval(() => {
		void runCycle();
	}, interval);

	void runCycle();
	console.log(`[DrugstoreSyncWorker] started with interval ${interval}ms`);
};

export const stopDrugstoreSyncWorker = () => {
	if (!timer) return;
	clearInterval(timer);
	timer = null;
};
