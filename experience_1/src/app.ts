import { startServer } from "./core";

startServer().catch((error) => {
	console.error("Experience 1 startup failed:", error.message);
	process.exit(1);
});
