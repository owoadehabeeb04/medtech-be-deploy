import { startServer } from "./core";

startServer().catch((error) => {
	console.error("Merchant startup failed:", error.message);
	process.exit(1);
});
