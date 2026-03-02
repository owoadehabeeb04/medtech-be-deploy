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
export declare class UploadService {
    private static s3Client;
    private static getS3Client;
    /**
     * Generate unique filename with timestamp
     */
    private static generateFilename;
    /**
     * Upload single file to S3
     */
    static uploadSingle(file: Express.Multer.File, folder?: string): Promise<UploadResult>;
    /**
     * Upload multiple files to S3
     */
    static uploadBulk(files: Express.Multer.File[], folder?: string): Promise<BulkUploadResult>;
}
export {};
//# sourceMappingURL=Upload.service.d.ts.map