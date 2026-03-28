import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { applicationConfig } from "../config";

interface IAWS {
	key: string;
	location: string;
	result: {};
}

const { awsOptions } = applicationConfig;

export default class AwsUtil_s3 {
	private s3Client: S3Client;
	constructor() {
		if (!awsOptions.accessKey || !awsOptions.s3BucketName || !awsOptions.region || !awsOptions.secretKey) {
			throw new Error("Missing required environment variables.");
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

	async upload(base64: string, contentType: string, filename: string): Promise<IAWS> {
		try {
			const data = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ""), "base64");

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
			console.log(error, "Error uploading______________");
			throw error;
		}
	}

	async uploadBuffer(buffer: Buffer, contentType: string, filename: string): Promise<IAWS> {
		try {
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
			console.log(error, "Error uploading buffer______________");
			throw error;
		}
	}
}
