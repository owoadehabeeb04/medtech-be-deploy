import express from "express";
import { Application } from "express";
import { bootstrapRequestContext } from "./context";
import routes from "./routes";
import { errorHandler } from "../middlewares/error.middleware";
import { notFoundHandler } from "../middlewares/not-found.middleware";
import { applicationConfig } from "../config";
import handleApplicationResponses from "./responseContext";
import { publicRateLimiter } from "../middlewares/rate-limit.middleware";

const timezone = applicationConfig.timezone;
process.env.TZ = timezone;

const { serverPort } = applicationConfig;

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

const app: Application = express();

app.set("trust proxy", 1);

app.use(publicRateLimiter);

app.use(express.static("asset"));
app.use(express.static("public"));

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

  app.listen(serverPort, () => console.log(`Server started on ${serverPort}`));
};
