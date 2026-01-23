import { OK, SERVICE_UNAVAILABLE } from "http-status";
import { RESPONSE_MESSAGES } from "../../constants/response";
import connection from "../../core/db";
import redisInit from "../../utils/redisInit";

type HealthCheckResponse = {
	status: boolean;
	message: string;
	code: number;
	data?: {
		app: ServiceStatus;
		db: ServiceStatus;
		redis: ServiceStatus;
	};
};

type ServiceStatus = {
	status: "up" | "down";
	error?: string;
};
class HealthService {
	private static redisClient: Awaited<ReturnType<typeof redisInit>> | null = null;

	private static async getRedisClient() {
		if (!this.redisClient) {
			this.redisClient = await redisInit();
		}
		return this.redisClient;
	}

	static async checkApp(): Promise<ServiceStatus> {
		return { status: "up" };
	}

	static async checkDb(): Promise<ServiceStatus> {
		try {
			const sequelize = await connection();
			await sequelize.authenticate();
			return { status: "up" };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			return { status: "down", error: message };
		}
	}

	static async checkRedis(): Promise<ServiceStatus> {
		try {
			const client = await this.getRedisClient();
			const pong = await client.ping();
			return pong === "PONG" ? { status: "up" } : { status: "down" };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			return { status: "down", error: message };
		}
	}

	// 🔹 Aggregate health check
	static async checkAll(): Promise<HealthCheckResponse> {
		const [app, db, redis] = await Promise.all([this.checkApp(), this.checkDb(), this.checkRedis()]);

		const isHealthy = app.status === "up" && db.status === "up" && redis.status === "up";

		return {
			status: isHealthy,
			code: isHealthy ? OK : SERVICE_UNAVAILABLE,
			message: isHealthy ? RESPONSE_MESSAGES.HEALTH_CHECK_PASSED : "One or more services are down",
			data: { app, db, redis },
		};
	}
}

export { HealthService };
