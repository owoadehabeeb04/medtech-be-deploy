"use strict";
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
const client_s3_1 = require("@aws-sdk/client-s3");
class AwsUtil_s3 {
    constructor(awsConfig) {
        if (!awsConfig.accessKey || !awsConfig.s3BucketName || !awsConfig.region || !awsConfig.secretKey) {
            throw new Error("Missing required AWS environment variables.");
        }
        this.awsConfig = awsConfig;
        const credentials = {
            accessKeyId: awsConfig.accessKey,
            secretAccessKey: awsConfig.secretKey,
        };
        this.s3Client = new client_s3_1.S3Client({
            region: awsConfig.region,
            credentials,
        });
    }
    upload(base64, contentType, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
                const params = {
                    Bucket: this.awsConfig.s3BucketName,
                    Key: filename,
                    Body: data,
                    ContentType: contentType,
                };
                const command = new client_s3_1.PutObjectCommand(params);
                const result = yield this.s3Client.send(command);
                const location = `https://${params.Bucket}.s3.${this.awsConfig.region}.amazonaws.com/${params.Key}`;
                return {
                    key: params.Key,
                    location,
                    result,
                };
            }
            catch (error) {
                console.log(error, "Error uploading to S3");
                throw error;
            }
        });
    }
}
exports.default = AwsUtil_s3;
