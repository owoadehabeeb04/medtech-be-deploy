import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface AWSConfig {
  accessKey: string;
  secretKey: string;
  region: string;
  s3BucketName: string;
}

export interface IAWS {
  key: string;
  location: string;
  result: {};
}

export default class AwsUtil_s3 {
  private s3Client: S3Client;
  private awsConfig: AWSConfig;

  constructor(awsConfig: AWSConfig) {
    if (!awsConfig.accessKey || !awsConfig.s3BucketName || !awsConfig.region || !awsConfig.secretKey) {
      throw new Error("Missing required AWS environment variables.");
    }

    this.awsConfig = awsConfig;

    const credentials = {
      accessKeyId: awsConfig.accessKey,
      secretAccessKey: awsConfig.secretKey,
    };

    this.s3Client = new S3Client({
      region: awsConfig.region,
      credentials,
    });
  }

  async upload(base64: string, contentType: string, filename: string): Promise<IAWS> {
    try {
      const data = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");

      const params = {
        Bucket: this.awsConfig.s3BucketName,
        Key: filename,
        Body: data,
        ContentType: contentType,
      };

      const command = new PutObjectCommand(params);
      const result = await this.s3Client.send(command);

      const location = `https://${params.Bucket}.s3.${this.awsConfig.region}.amazonaws.com/${params.Key}`;

      return {
        key: params.Key,
        location,
        result,
      };
    } catch (error) {
      console.log(error, "Error uploading to S3");
      throw error;
    }
  }
}
