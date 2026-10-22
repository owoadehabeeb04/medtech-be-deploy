import { applicationConfig } from "../../config";
import { DrugstoreService } from "./Drugstore.service";

let timer: NodeJS.Timeout | null = null;
let running = false;
let pendingCycle: Promise<void> | null = null;

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
		if (!running) pendingCycle = runCycle();
	}, interval);

	pendingCycle = runCycle();
	console.log(`[DrugstoreSyncWorker] started with interval ${interval}ms`);
};

export const stopDrugstoreSyncWorker = async () => {
	if (timer) clearInterval(timer);
	timer = null;
	await pendingCycle;
};
