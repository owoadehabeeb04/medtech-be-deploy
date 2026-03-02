import { ContactSupportDTO } from "./Support.dto";
export declare class SupportService {
    static contactSupport(merchantId: string, merchantEmail: string, merchantName: string, data: ContactSupportDTO): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=Support.service.d.ts.map