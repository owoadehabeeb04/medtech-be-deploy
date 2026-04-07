import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";
import { applicationConfig } from "../config";

interface IAWS {
	key: string;
	location: string;
	result: {};
}

const { awsOptions, isProduction, url } = applicationConfig;

export default class AwsUtil_s3 {
	private s3Client: S3Client | null;
	constructor() {
		if (!awsOptions.accessKey || !awsOptions.s3BucketName || !awsOptions.region || !awsOptions.secretKey) {
			if (isProduction) {
				throw new Error("Missing required environment variables.");
			}

			this.s3Client = null;
			return;
		}

		const credentials = {
			accessKeyId: awsOptions.accessKey,
			secretAccessKey: awsOptions.secretKey,
		};

		this.s3Client = new S3Client({
			region: awsOptions.region,
			credentials,
		});
	}

	private async uploadToLocal(buffer: Buffer, filename: string): Promise<IAWS> {
		const normalizedFilename = filename.replace(/^\/+/, "");
		const assetRoot = path.resolve(process.cwd(), "asset");
		const relativeLocation = path.join("uploads", normalizedFilename).replace(/\\/g, "/");
		const destination = path.join(assetRoot, relativeLocation);

		await fs.mkdir(path.dirname(destination), { recursive: true });
		await fs.writeFile(destination, buffer);

		return {
			key: relativeLocation,
			location: `${url.baseApi.replace(/\/$/, "")}/${relativeLocation}`,
			result: { storage: "local" },
		};
	}

	async upload(base64: string, contentType: string, filename: string): Promise<IAWS> {
		const data = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ""), "base64");

		try {
			if (!this.s3Client) {
				if (!isProduction) {
					return this.uploadToLocal(data, filename);
				}
				throw new Error("S3 client is not configured");
			}

			const params = {
				Bucket: awsOptions.s3BucketName,
				Key: filename,
				Body: data,
				// ACL: ObjectCannedACL.public_read,
				ContentType: contentType,
			};

			const command = new PutObjectCommand(params);
			const result = await this.s3Client.send(command);

			const location = `https://${params.Bucket}.s3.${awsOptions.region}.amazonaws.com/${params.Key}`;

			return {
				key: params.Key,
				location,
				result,
			};
		} catch (error) {
			if (!isProduction) {
				console.warn(error, "Falling back to local file storage for base64 upload______________");
				return this.uploadToLocal(data, filename);
			}
			console.log(error, "Error uploading______________");
			throw error;
		}
	}

	async uploadBuffer(buffer: Buffer, contentType: string, filename: string): Promise<IAWS> {
		try {
			if (!this.s3Client) {
				if (!isProduction) {
					return this.uploadToLocal(buffer, filename);
				}
				throw new Error("S3 client is not configured");
			}

			const params = {
				Bucket: awsOptions.s3BucketName,
				Key: filename,
				Body: buffer,
				ContentType: contentType,
			};

			const command = new PutObjectCommand(params);
			const result = await this.s3Client.send(command);
			const location = `https://${params.Bucket}.s3.${awsOptions.region}.amazonaws.com/${params.Key}`;

			return {
				key: params.Key,
				location,
				result,
			};
		} catch (error) {
			if (!isProduction) {
				console.warn(error, "Falling back to local file storage for buffer upload______________");
				return this.uploadToLocal(buffer, filename);
			}
			console.log(error, "Error uploading buffer______________");
			throw error;
		}
	}
}
