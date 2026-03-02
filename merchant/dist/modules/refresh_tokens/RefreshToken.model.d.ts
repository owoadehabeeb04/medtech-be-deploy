import { Model } from "sequelize-typescript";
import { Merchant } from "../merchant/Merchant.model";
export declare class RefreshToken extends Model<RefreshToken> {
    id: string;
    merchantId: string;
    merchant: Merchant;
    token: string;
    expiresAt: Date;
    isActive: boolean;
    deviceInfo: string;
    ipAddress: string;
    createdAt: Date;
    updatedAt: Date;
    get isExpired(): boolean;
    get isValid(): boolean;
}
//# sourceMappingURL=RefreshToken.model.d.ts.map