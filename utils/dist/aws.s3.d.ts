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
    private s3Client;
    private awsConfig;
    constructor(awsConfig: AWSConfig);
    upload(base64: string, contentType: string, filename: string): Promise<IAWS>;
}
//# sourceMappingURL=aws.s3.d.ts.map