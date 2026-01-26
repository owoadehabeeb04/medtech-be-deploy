import { createClient } from "redis";
import { applicationConfig } from "../config";
export type RedisClientType = ReturnType<typeof createClient>;

let redisClient: RedisClientType;
let isReady: boolean /* , setAsync: any, getAsync: any */;
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


export const redisReady = isReady;

export default async function redisInit(): Promise<RedisClientType> {
	redisClient = createClient();

	redisClient.on("connect", function () {
		console.log("Redis is connected....");
	});

	redisClient.on("error", function (err: any) {
		console.log("Redis error.");
	});

	redisClient.on("ready", () => {
		isReady = true;
		console.info("Redis is ready!");
	});

	setInterval(function () {
		console.log("Keeping redis alive...", new Date());
		redisClient.set("ping", "pong");
	}, 60000 * 5);

	await redisClient.connect();
	return redisClient;
}
