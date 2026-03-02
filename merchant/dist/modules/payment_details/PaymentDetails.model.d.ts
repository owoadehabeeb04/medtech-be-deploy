import { Model } from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";
export declare class PaymentDetails extends Model<PaymentDetails> {
    merchantId: string;
    merchant: Merchant;
    bankName: string;
    bankCode: string;
    bankAccountNumber: string;
    bankAccountName: string;
    bankVerified: boolean;
    verifiedAt: Date;
}
//# sourceMappingURL=PaymentDetails.model.d.ts.map