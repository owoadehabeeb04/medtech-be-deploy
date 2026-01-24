import { OK, SERVICE_UNAVAILABLE } from "http-status";
import { RESPONSE_MESSAGES } from "../../constants/response";
import connection from "../../core/db";

type HealthCheckResponse = {
  status: boolean;
  message: string;
  code: number;
  data?: {
    app: ServiceStatus;
    db: ServiceStatus;
  };
};

type ServiceStatus = {
  status: "up" | "down";
  error?: string;
};

class HealthService {
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

  static async checkAll(): Promise<HealthCheckResponse> {
    const [app, db] = await Promise.all([this.checkApp(), this.checkDb()]);

    const isHealthy = app.status === "up" && db.status === "up";

    return {
      status: isHealthy,
      code: isHealthy ? OK : SERVICE_UNAVAILABLE,
      message: isHealthy ? RESPONSE_MESSAGES.HEALTH_CHECK_PASSED : "One or more services are down",
      data: { app, db },
    };
  }
}

export { HealthService };
