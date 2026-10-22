import express from "express";
import { Application } from "express";
import { bootstrapRequestContext } from "./context";
import routes from "./routes";
import { errorHandler } from "../middlewares/error.middleware";
import { notFoundHandler } from "../middlewares/not-found.middleware";
import { applicationConfig } from "../config";
import redisInit, { closeRedis } from "../utils/redisInit";
import handleApplicationResponses from "./responseContext";
import rateLimit from "express-rate-limit";
import eventListeners from "../observers/user.observer";
import { startDrugstoreSyncWorker, stopDrugstoreSyncWorker } from "../modules/drugstore/DrugstoreSync.worker";
const timezone = "Africa/Lagos";
process.env.TZ = timezone;

const { rateLimitOptions, serverPort } = applicationConfig;

export type RequestContextType = Awaited<ReturnType<typeof bootstrapRequestContext>>;

declare global {
	namespace Express {
		interface Request {
			context: RequestContextType;
		}
		interface Response {
			response?: {
				statusCode?: number;
				message?: string;
				data?: unknown;
			};
		}
	}
}

let requestContext: RequestContextType;
let listenersBootstrapped = false;

const app: Application = express();

app.set("trust proxy", 1);

const limiter = rateLimit({
	windowMs: rateLimitOptions.duration,
	max: rateLimitOptions.maxRequestsPerMinute,
	message: {
		status: 429,
		message: "Too many requests from this IP. Try again in a minute.",
	},
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => process.env.COMBINED_DEPLOYMENT === "true" && req.path === "/api/v1/main/health",
});

app.use(limiter);

app.use(express.static("asset"));
// app.use(express.static("public"));

app.use(async (req, _, next) => {
	req.context = { ...requestContext };
	return next();
});

routes(app);

app.use(handleApplicationResponses);

app.use(errorHandler);

app.use(notFoundHandler);

export const startServer = async (): Promise<void> => {
	requestContext = await bootstrapRequestContext();
	await redisInit();

	if (!listenersBootstrapped) {
		eventListeners();
		listenersBootstrapped = true;
	}

	const server = app.listen(serverPort, process.env.HOST || "0.0.0.0");
	await new Promise<void>((resolve, reject) => {
		server.once("listening", resolve);
		server.once("error", reject);
	});
	if (process.env.COMBINED_DEPLOYMENT === "true" && process.send) {
		process.on("message", (message: any) => {
			if (message?.type === "start-workers") startDrugstoreSyncWorker();
		});
	} else {
		startDrugstoreSyncWorker();
	}
	let stopping = false;
	const shutdown = async () => {
		if (stopping) return;
		stopping = true;
		const deadline = setTimeout(() => process.exit(1), 20000);
		try {
			await new Promise<void>((resolve) => server.close(() => resolve()));
			await stopDrugstoreSyncWorker();
			await closeRedis();
			await requestContext.sequelize.close();
			clearTimeout(deadline);
			process.exit(0);
		} catch {
			process.exit(1);
		}
	};
	process.once("SIGTERM", () => void shutdown());
	process.once("SIGINT", () => void shutdown());
	console.log(`Server started on ${serverPort}`);
	process.send?.({ type: "ready" });
};
