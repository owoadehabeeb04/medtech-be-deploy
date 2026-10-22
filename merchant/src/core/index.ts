import express from "express";
import { Application } from "express";
import { bootstrapRequestContext } from "./context";
import routes from "./routes";
import { errorHandler } from "../middlewares/error.middleware";
import { notFoundHandler } from "../middlewares/not-found.middleware";
import { applicationConfig } from "../config";
import handleApplicationResponses from "./responseContext";
import { publicRateLimiter } from "../middlewares/rate-limit.middleware";
import { scheduleBankCodeMigration } from "../service/Payments/BankCodeMigration";
import { scheduleSweeper } from "../modules/payments/PaymentSweeper";

const timezone = applicationConfig.timezone;
process.env.TZ = timezone;

const { serverPort } = applicationConfig;

export type RequestContextType = Awaited<ReturnType<typeof bootstrapRequestContext>>;

declare global {
	namespace Express {
		interface Request {
			context: RequestContextType;
			rawBody?: Buffer;
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

const app: Application = express();

app.set("trust proxy", 1);

app.use(publicRateLimiter);

app.use(express.static("asset"));
app.use(express.static("public"));

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

	const server = app.listen(serverPort, process.env.HOST || "0.0.0.0");
	await new Promise<void>((resolve, reject) => {
		server.once("listening", resolve);
		server.once("error", reject);
	});
	let stopping = false;
	const shutdown = async () => {
		if (stopping) return;
		stopping = true;
		const deadline = setTimeout(() => process.exit(1), 20000);
		try {
			await new Promise<void>((resolve) => server.close(() => resolve()));
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
	// One-time Paystack -> Paga bank code conversion; runs in the background and records when it has finished
	scheduleBankCodeMigration(requestContext.sequelize);
	// Checks pending Paga payments whose webhook never arrived
	scheduleSweeper(requestContext.sequelize);
	process.send?.({ type: "ready" });
};
