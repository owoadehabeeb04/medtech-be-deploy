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
declare class HealthService {
    static checkApp(): Promise<ServiceStatus>;
    static checkDb(): Promise<ServiceStatus>;
    static checkAll(): Promise<HealthCheckResponse>;
}
export { HealthService };
//# sourceMappingURL=Health.service.d.ts.map