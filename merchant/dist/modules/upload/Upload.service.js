"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const config_1 = require("../../config");
const path = __importStar(require("path"));
const { aws } = config_1.applicationConfig;
class UploadService {
    static getS3Client() {
        if (!this.s3Client) {
            if (!aws.accessKey || !aws.s3BucketName || !aws.region || !aws.secretKey) {
                throw new Error("Missing required AWS environment variables");
            }
            this.s3Client = new client_s3_1.S3Client({
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
    static generateFilename(originalname, folder) {
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
    static uploadSingle(file_1) {
        return __awaiter(this, arguments, void 0, function* (file, folder = "general") {
            try {
                const client = this.getS3Client();
                const key = this.generateFilename(file.originalname, folder);
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: aws.s3BucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                });
                yield client.send(command);
                const url = `https://${aws.s3BucketName}.s3.${aws.region}.amazonaws.com/${key}`;
                return {
                    url,
                    key,
                    filename: file.originalname,
                    size: file.size,
                    mimetype: file.mimetype,
                };
            }
            catch (error) {
                console.error("S3 upload error:", error);
                throw new Error("Failed to upload file to S3");
            }
        });
    }
    /**
     * Upload multiple files to S3
     */
    static uploadBulk(files_1) {
        return __awaiter(this, arguments, void 0, function* (files, folder = "general") {
            try {
                const uploadPromises = files.map((file) => this.uploadSingle(file, folder));
                const uploadedFiles = yield Promise.all(uploadPromises);
                const totalSize = files.reduce((sum, file) => sum + file.size, 0);
                return {
                    files: uploadedFiles,
                    totalSize,
                };
            }
            catch (error) {
                console.error("Bulk upload error:", error);
                throw new Error("Failed to upload files to S3");
            }
        });
    }
}
exports.UploadService = UploadService;
