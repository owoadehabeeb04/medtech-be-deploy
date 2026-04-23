import express from "express";
import { Application } from "express";
import { bootstrapRequestContext } from "./context";
import routes from "./routes";
import { errorHandler } from "../middlewares/error.middleware";
import { notFoundHandler } from "../middlewares/not-found.middleware";
import { applicationConfig } from "../config";
import redisInit from "../utils/redisInit";
import handleApplicationResponses from "./responseContext";
import rateLimit from "express-rate-limit";
import eventListeners from "../observers/user.observer";
import { startDrugstoreSyncWorker } from "../modules/drugstore/DrugstoreSync.worker";
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
});

app.use(limiter);

app.use(express.static("asset"));
// app.use(express.static("public"));

//INITIATE REDIS
redisInit();

app.use(async (req, _, next) => {
	req.context = requestContext;
	return next();
});

routes(app);

app.use(handleApplicationResponses);

app.use(errorHandler);

app.use(notFoundHandler);

export const startServer = async (): Promise<void> => {
	requestContext = await bootstrapRequestContext();

	if (!listenersBootstrapped) {
		eventListeners();
		startDrugstoreSyncWorker();
		listenersBootstrapped = true;
	}

	app.listen(serverPort, () => console.log(`Server started on ${serverPort}`));
};
