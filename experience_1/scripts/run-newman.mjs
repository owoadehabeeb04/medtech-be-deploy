import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(projectDir, "..");
const collectionPath = path.join(repoDir, "docs", "postman", "experience_1", "experience1-auth-profile.postman_collection.json");
const environmentPath = path.join(repoDir, "docs", "postman", "experience_1", "experience1-auth-profile.postman_environment.json");
const baseUrl = process.env.VERIFY_BASE_URL || `http://127.0.0.1:${process.env.APP_PORT || 6200}/api/v1/main`;
const allowNpxFallback = /^(1|true)$/i.test(process.env.NEWMAN_USE_NPX || "");

function resolveCommand() {
	const newmanVersion = spawnSync("newman", ["--version"], { stdio: "ignore" });
	if (newmanVersion.status === 0) {
		return { command: "newman", args: [] };
	}

	if (allowNpxFallback) {
		return { command: "npx", args: ["--yes", "newman@latest"] };
	}

	throw new Error(
		"Newman is not installed. Install it locally or rerun with NEWMAN_USE_NPX=true to allow an npx fallback."
	);
}

async function main() {
	const resolved = resolveCommand();
	const args = [
		...resolved.args,
		"run",
		collectionPath,
		"-e",
		environmentPath,
		"--env-var",
		`baseUrl=${baseUrl}`,
	];

	await new Promise((resolve, reject) => {
		const child = spawn(resolved.command, args, {
			cwd: projectDir,
			stdio: "inherit",
			env: process.env,
		});

		child.on("exit", (code) => {
			if (code === 0) return resolve();
			reject(new Error(`Newman exited with code ${code}`));
		});

		child.on("error", reject);
	});
}

main().catch((error) => {
	console.error(`[verify:endpoints:newman] ${error.message}`);
	process.exitCode = 1;
});
