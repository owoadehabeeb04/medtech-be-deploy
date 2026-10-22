import { createClient } from "redis";
import { applicationConfig } from "../config";
export type RedisClientType = ReturnType<typeof createClient>;

let redisClient: RedisClientType;
export let redisReady = false;
let connecting: Promise<RedisClientType> | null = null;
const redisExpTime = applicationConfig.redisExpirationTime;

export interface RdbAuthSession {
	otp?: string;
	sessionId: string;
	phoneNumber: string;
	userType?: string;
	validated?: boolean;
	createdAt?: Date;
	path?: string;
}

export const redisSet = async (key: any, value: any, ex?: number) => {
	//300 -> 5 minutes // 1000 * 60 * 10 // 10 minutes

	return ex ? await redisClient.setEx(key, ex, value) : await redisClient.set(key, value);
};
export const redisGet = async (key: any) => await redisClient.get(key);
export const redisDel = async (key: any) => await redisClient.del(key);

//AUTH
export const rdbSet__authSession = async (sessionId: string, value: RdbAuthSession) => {
	return await redisSet(`AUTH_SESSION_${sessionId}`, JSON.stringify({ ...value }), redisExpTime);
};

export const rdbGet__authSession = async (sessionId: string): Promise<RdbAuthSession | null> => {
	const result = await redisGet(`AUTH_SESSION_${sessionId}`);
	if (result) {
		return JSON.parse(result);
	}

	return null;
};

export const rdbDel__authSession = async (sessionId: string) => {
	return await redisDel(`AUTH_SESSION_${sessionId}`);
};




export default function redisInit(): Promise<RedisClientType> {
	if (connecting) return connecting;
	connecting = connectRedis().catch((error) => {
		connecting = null;
		throw error;
	});
	return connecting;
}

async function connectRedis(): Promise<RedisClientType> {
	redisClient = applicationConfig.redis.url
		? createClient({ url: applicationConfig.redis.url })
		: createClient({
				socket: {
					host: applicationConfig.redis.host || "127.0.0.1",
					port: applicationConfig.redis.port || 6379,
				},
				password: applicationConfig.redis.password || undefined,
		  });

	redisClient.on("connect", function () {
		console.log("Redis is connected....");
	});

	redisClient.on("error", function (err: any) {
		console.log("Redis error.");
	});

	redisClient.on("ready", () => {
		redisReady = true;
		console.info("Redis is ready!");
	});

	redisClient.on("end", () => { redisReady = false; });
	redisClient.on("reconnecting", () => { redisReady = false; });

	await redisClient.connect();
	return redisClient;
}

export async function closeRedis(): Promise<void> {
	if (redisClient?.isOpen) {
		if (redisClient.isReady) await redisClient.quit();
		else await redisClient.disconnect();
	}
	redisReady = false;
	connecting = null;
}
