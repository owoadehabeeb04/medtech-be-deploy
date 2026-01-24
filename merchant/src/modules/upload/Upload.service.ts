import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { applicationConfig } from "../../config";
import * as path from "path";

const { aws } = applicationConfig;

interface UploadResult {
  url: string;
  key: string;
  filename: string;
  size: number;
  mimetype: string;
}

interface BulkUploadResult {
  files: UploadResult[];
  totalSize: number;
}

export class UploadService {
  private static s3Client: S3Client;

  private static getS3Client(): S3Client {
    if (!this.s3Client) {
      if (!aws.accessKey || !aws.s3BucketName || !aws.region || !aws.secretKey) {
        throw new Error("Missing required AWS environment variables");
      }

      this.s3Client = new S3Client({
        region: aws.region,
        credentials: {
          accessKeyId: aws.accessKey,
          secretAccessKey: aws.secretKey,
        },
      });
    }

    return this.s3Client;
  }

  /**
   * Generate unique filename with timestamp
   */
  private static generateFilename(originalname: string, folder: string): string {
    const ext = path.extname(originalname);
    const basename = path.basename(originalname, ext);
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9-_]/g, "_");
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    return `${folder}/${timestamp}-${random}-${sanitizedBasename}${ext}`;
  }

  /**
   * Upload single file to S3
   */
  static async uploadSingle(file: Express.Multer.File, folder: string = "general"): Promise<UploadResult> {
    try {
      const client = this.getS3Client();
      const key = this.generateFilename(file.originalname, folder);

      const command = new PutObjectCommand({
        Bucket: aws.s3BucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await client.send(command);

      const url = `https://${aws.s3BucketName}.s3.${aws.region}.amazonaws.com/${key}`;

      return {
        url,
        key,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      console.error("S3 upload error:", error);
      throw new Error("Failed to upload file to S3");
    }
  }

  /**
   * Upload multiple files to S3
   */
  static async uploadBulk(files: Express.Multer.File[], folder: string = "general"): Promise<BulkUploadResult> {
    try {
      const uploadPromises = files.map((file) => this.uploadSingle(file, folder));
      const uploadedFiles = await Promise.all(uploadPromises);

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      return {
        files: uploadedFiles,
        totalSize,
      };
    } catch (error) {
      console.error("Bulk upload error:", error);
      throw new Error("Failed to upload files to S3");
    }
  }
}
