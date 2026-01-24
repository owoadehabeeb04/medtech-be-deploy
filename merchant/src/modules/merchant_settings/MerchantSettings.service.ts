import { Merchant } from "../merchant/Merchant.model";
import { StoreDetails } from "../store_details/StoreDetails.model";
import { PaymentDetails } from "../payment_details/PaymentDetails.model";
import { MerchantSettings } from "./MerchantSettings.model";
import { PaystackService } from "../../service/Paystack/Paystack.service";
import {
  UpdateProfileDTO,
  UpdatePaymentDTO,
  UpdateStoreDTO,
  ChangePasswordDTO,
  UpdateNotificationsDTO,
  UpdatePreferencesDTO,
  UpdateAllSettingsDTO,
} from "./MerchantSettings.dto";
import { verifyPassword, hashPassword, deepMerge } from "@medtech/utils";

export interface ApiResponse {
  status: boolean;
  code: number;
  message: string;
  data?: any;
}

export class MerchantSettingsService {
  /**
   * Get all settings for a merchant
   */
  static async getAllSettings(merchantId: string): Promise<ApiResponse> {
    const merchant = await Merchant.findByPk(merchantId, {
      include: [
        { model: StoreDetails, as: "storeDetails" },
        { model: PaymentDetails, as: "paymentDetails" },
        { model: MerchantSettings, as: "settings" },
      ],
    });

    if (!merchant) {
      return {
        status: false,
        code: 404,
        message: "Merchant not found",
      };
    }

    return {
      status: true,
      code: 200,
      message: "Settings retrieved successfully",
      data: {
        profile: {
          firstName: merchant.firstName,
          lastName: merchant.lastName,
          email: merchant.email,
          phoneNumber: merchant.phoneNumber,
          phoneCountryCode: merchant.phoneCountryCode,
          profilePictureUrl: merchant.profilePictureUrl,
        },
        payment: merchant.paymentDetails
          ? {
              bankName: merchant.paymentDetails.bankName,
              bankAccountNumber: merchant.paymentDetails.bankAccountNumber,
              bankAccountName: merchant.paymentDetails.bankAccountName,
              bankVerified: merchant.paymentDetails.bankVerified,
            }
          : null,
        store: merchant.storeDetails
          ? {
              businessName: merchant.storeDetails.businessName,
              businessUrl: merchant.storeDetails.businessUrl,
              businessAddress: merchant.storeDetails.businessAddress,
              city: merchant.storeDetails.city,
              state: merchant.storeDetails.state,
              landmark: merchant.storeDetails.landmark,
              openHour: merchant.storeDetails.openHour,
              closeHour: merchant.storeDetails.closeHour,
              vacation: merchant.storeDetails.vacation,
              vacationStartDate: merchant.storeDetails.vacationStartDate,
              vacationEndDate: merchant.storeDetails.vacationEndDate,
              storeBannerUrl: merchant.storeDetails.storeBannerUrl,
              storeDescription: merchant.storeDetails.storeDescription,
            }
          : null,
        notifications: merchant.settings
          ? {
              pushNotificationsEnabled: merchant.settings.pushNotificationsEnabled,
              emailNotificationsEnabled: merchant.settings.emailNotificationsEnabled,
              notificationPreferences: merchant.settings.notificationPreferences,
            }
          : null,
        preferences: merchant.settings
          ? {
              storePreferences: merchant.settings.storePreferences,
            }
          : null,
      },
    };
  }

  /**
   * Update merchant profile (personal details)
   */
  static async updateProfile(
    merchantId: string,
    data: UpdateProfileDTO
  ): Promise<ApiResponse> {
    const merchant = await Merchant.findByPk(merchantId);

    if (!merchant) {
      return {
        status: false,
        code: 404,
        message: "Merchant not found",
      };
    }

    // Update only provided fields
    if (data.firstName !== undefined) merchant.firstName = data.firstName;
    if (data.lastName !== undefined) merchant.lastName = data.lastName;
    if (data.phoneNumber !== undefined) merchant.phoneNumber = data.phoneNumber;
    if (data.phoneCountryCode !== undefined)
      merchant.phoneCountryCode = data.phoneCountryCode;

    await merchant.save();

    return {
      status: true,
      code: 200,
      message: "Profile updated successfully",
      data: {
        firstName: merchant.firstName,
        lastName: merchant.lastName,
        phoneNumber: merchant.phoneNumber,
        phoneCountryCode: merchant.phoneCountryCode,
      },
    };
  }

  /**
   * Update payment details with Paystack verification
   */
  static async updatePayment(
    merchantId: string,
    data: UpdatePaymentDTO
  ): Promise<ApiResponse> {
    const merchant = await Merchant.findByPk(merchantId, {
      include: [{ model: PaymentDetails, as: "paymentDetails" }],
    });

    if (!merchant) {
      return {
        status: false,
        code: 404,
        message: "Merchant not found",
      };
    }

    // Verify account with Paystack
    const verification = await PaystackService.verifyBankAccount(
      data.accountNumber,
      data.bankCode
    );

    if (!verification.verified) {
      return {
        status: false,
        code: 400,
        message: "Bank account verification failed",
      };
    }

    // Compare names (fuzzy match)
    const nameMatch = PaystackService.compareNames(
      data.accountName,
      verification.accountName
    );

    if (!nameMatch) {
      return {
        status: false,
        code: 400,
        message: "Account name verification failed",
        data: {
          providedName: data.accountName,
          actualName: verification.accountName,
          message: "The account name provided does not match the bank records",
        },
      };
    }

    // Get bank name from Paystack
    const banks = await PaystackService.getBankList();
    const bank = banks.find((b: any) => b.code === data.bankCode);

    // Update or create payment details
    if (merchant.paymentDetails) {
      await merchant.paymentDetails.update({
        bankName: bank?.name || "Unknown Bank",
        bankCode: data.bankCode,
        bankAccountNumber: data.accountNumber,
        bankAccountName: verification.accountName,
        bankVerified: true,
        verifiedAt: new Date(),
      });
    } else {
      await PaymentDetails.create({
        merchantId: merchant.id,
        bankName: bank?.name || "Unknown Bank",
        bankCode: data.bankCode,
        bankAccountNumber: data.accountNumber,
        bankAccountName: verification.accountName,
        bankVerified: true,
        verifiedAt: new Date(),
      });
    }

    // Reload to get updated data
    await merchant.reload({ include: [{ model: PaymentDetails, as: "paymentDetails" }] });

    return {
      status: true,
      code: 200,
      message: "Payment details updated and verified successfully",
      data: {
        bankName: merchant.paymentDetails!.bankName,
        bankAccountNumber: merchant.paymentDetails!.bankAccountNumber,
        bankAccountName: merchant.paymentDetails!.bankAccountName,
        bankVerified: merchant.paymentDetails!.bankVerified,
        verifiedAt: merchant.paymentDetails!.verifiedAt,
      },
    };
  }

  /**
   * Update store details
   */
  static async updateStore(
    merchantId: string,
    data: UpdateStoreDTO
  ): Promise<ApiResponse> {
    const merchant = await Merchant.findByPk(merchantId, {
      include: [{ model: StoreDetails, as: "storeDetails" }],
    });

    if (!merchant || !merchant.storeDetails) {
      return {
        status: false,
        code: 404,
        message: "Store details not found",
      };
    }

    const storeDetails = merchant.storeDetails;

    // Update only provided fields
    if (data.businessName !== undefined) storeDetails.businessName = data.businessName;
    if (data.businessUrl !== undefined) storeDetails.businessUrl = data.businessUrl;
    if (data.businessAddress !== undefined)
      storeDetails.businessAddress = data.businessAddress;
    if (data.city !== undefined) storeDetails.city = data.city;
    if (data.state !== undefined) storeDetails.state = data.state;
    if (data.landmark !== undefined) storeDetails.landmark = data.landmark;
    if (data.openHour !== undefined) storeDetails.openHour = data.openHour;
    if (data.closeHour !== undefined) storeDetails.closeHour = data.closeHour;
    if (data.vacation !== undefined) storeDetails.vacation = data.vacation;
    if (data.vacationStartDate !== undefined)
      storeDetails.vacationStartDate = new Date(data.vacationStartDate);
    if (data.vacationEndDate !== undefined)
      storeDetails.vacationEndDate = new Date(data.vacationEndDate);
    if (data.storeDescription !== undefined)
      storeDetails.storeDescription = data.storeDescription;
    if (data.storeBannerUrl !== undefined)
      storeDetails.storeBannerUrl = data.storeBannerUrl;

    await storeDetails.save();

    return {
      status: true,
      code: 200,
      message: "Store details updated successfully",
      data: {
        businessName: storeDetails.businessName,
        businessUrl: storeDetails.businessUrl,
        businessAddress: storeDetails.businessAddress,
        city: storeDetails.city,
        state: storeDetails.state,
        landmark: storeDetails.landmark,
        openHour: storeDetails.openHour,
        closeHour: storeDetails.closeHour,
        vacation: storeDetails.vacation,
        vacationStartDate: storeDetails.vacationStartDate,
        vacationEndDate: storeDetails.vacationEndDate,
        storeDescription: storeDetails.storeDescription,
        storeBannerUrl: storeDetails.storeBannerUrl,
      },
    };
  }

  /**
   * Change password
   */
  static async changePassword(
    merchantId: string,
    data: ChangePasswordDTO
  ): Promise<ApiResponse> {
    const merchant = await Merchant.findByPk(merchantId);

    if (!merchant) {
      return {
        status: false,
        code: 404,
        message: "Merchant not found",
      };
    }

    // Verify current password
    const isPasswordValid = await verifyPassword(data.currentPassword, merchant.password);
    if (!isPasswordValid) {
      return {
        status: false,
        code: 400,
        message: "Current password is incorrect",
      };
    }

    // Hash new password
    const hashedPassword = await hashPassword(data.newPassword);

    // Update password
    merchant.password = hashedPassword;
    await merchant.save();

    return {
      status: true,
      code: 200,
      message: "Password changed successfully",
      data: null,
    };
  }

  /**
   * Update notification settings (toggle-based, instant save)
   */
  static async updateNotifications(
    merchantId: string,
    data: UpdateNotificationsDTO
  ): Promise<ApiResponse> {
    const settings = await MerchantSettings.findOne({ where: { merchantId } });

    if (!settings) {
      return {
        status: false,
        code: 404,
        message: "Settings not found",
      };
    }

    // Update top-level boolean fields
    if (data.pushNotificationsEnabled !== undefined) {
      settings.pushNotificationsEnabled = data.pushNotificationsEnabled;
    }

    if (data.emailNotificationsEnabled !== undefined) {
      settings.emailNotificationsEnabled = data.emailNotificationsEnabled;
    }

    // Deep merge notification preferences
    if (data.notificationPreferences) {
      settings.notificationPreferences = deepMerge(
        settings.notificationPreferences,
        data.notificationPreferences as any
      );
    }

    await settings.save();

    return {
      status: true,
      code: 200,
      message: "Notification settings updated successfully",
      data: {
        pushNotificationsEnabled: settings.pushNotificationsEnabled,
        emailNotificationsEnabled: settings.emailNotificationsEnabled,
        notificationPreferences: settings.notificationPreferences,
      },
    };
  }

  /**
   * Update store preferences (toggle-based with save button)
   */
  static async updatePreferences(
    merchantId: string,
    data: UpdatePreferencesDTO
  ): Promise<ApiResponse> {
    const settings = await MerchantSettings.findOne({ where: { merchantId } });

    if (!settings) {
      return {
        status: false,
        code: 404,
        message: "Settings not found",
      };
    }

    // Deep merge store preferences
    if (data.storePreferences) {
      settings.storePreferences = deepMerge(
        settings.storePreferences,
        data.storePreferences
      );
    }

    await settings.save();

    return {
      status: true,
      code: 200,
      message: "Store preferences updated successfully",
      data: {
        storePreferences: settings.storePreferences,
      },
    };
  }

  /**
   * Update all settings at once (unified endpoint for UI)
   */
  static async updateAllSettings(
    merchantId: string,
    data: UpdateAllSettingsDTO
  ): Promise<ApiResponse> {
    const results: any = {
      profile: null,
      payment: null,
      store: null,
      notifications: null,
      preferences: null,
    };

    const errors: string[] = [];

    // Update profile if any profile fields are provided
    const hasProfileFields = data.firstName !== undefined || 
                            data.lastName !== undefined || 
                            data.phoneNumber !== undefined || 
                            data.phoneCountryCode !== undefined;
    
    if (hasProfileFields) {
      const profileData: UpdateProfileDTO = {};
      if (data.firstName !== undefined) profileData.firstName = data.firstName;
      if (data.lastName !== undefined) profileData.lastName = data.lastName;
      if (data.phoneNumber !== undefined) profileData.phoneNumber = data.phoneNumber;
      if (data.phoneCountryCode !== undefined) profileData.phoneCountryCode = data.phoneCountryCode;

      const profileResult = await this.updateProfile(merchantId, profileData);
      if (profileResult.status) {
        results.profile = profileResult.data;
      } else {
        errors.push(`Profile: ${profileResult.message}`);
      }
    }

    // Update store if any store fields are provided
    const hasStoreFields = data.businessName !== undefined || 
                          data.businessUrl !== undefined || 
                          data.businessAddress !== undefined ||
                          data.city !== undefined ||
                          data.state !== undefined ||
                          data.landmark !== undefined ||
                          data.openHour !== undefined ||
                          data.closeHour !== undefined ||
                          data.vacation !== undefined ||
                          data.vacationStartDate !== undefined ||
                          data.vacationEndDate !== undefined ||
                          data.storeDescription !== undefined ||
                          data.storeBannerUrl !== undefined;

    if (hasStoreFields) {
      const storeData: UpdateStoreDTO = {};
      if (data.businessName !== undefined) storeData.businessName = data.businessName;
      if (data.businessUrl !== undefined) storeData.businessUrl = data.businessUrl;
      if (data.businessAddress !== undefined) storeData.businessAddress = data.businessAddress;
      if (data.city !== undefined) storeData.city = data.city;
      if (data.state !== undefined) storeData.state = data.state;
      if (data.landmark !== undefined) storeData.landmark = data.landmark;
      if (data.openHour !== undefined) storeData.openHour = data.openHour;
      if (data.closeHour !== undefined) storeData.closeHour = data.closeHour;
      if (data.vacation !== undefined) storeData.vacation = data.vacation;
      if (data.vacationStartDate !== undefined) storeData.vacationStartDate = data.vacationStartDate;
      if (data.vacationEndDate !== undefined) storeData.vacationEndDate = data.vacationEndDate;
      if (data.storeDescription !== undefined) storeData.storeDescription = data.storeDescription;
      if (data.storeBannerUrl !== undefined) storeData.storeBannerUrl = data.storeBannerUrl;

      const storeResult = await this.updateStore(merchantId, storeData);
      if (storeResult.status) {
        results.store = storeResult.data;
      } else {
        errors.push(`Store: ${storeResult.message}`);
      }
    }

    // Update payment if all payment fields are provided
    if (data.bankCode && data.accountNumber && data.accountName) {
      const paymentData: UpdatePaymentDTO = {
        bankCode: data.bankCode,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
      };

      const paymentResult = await this.updatePayment(merchantId, paymentData);
      if (paymentResult.status) {
        results.payment = paymentResult.data;
      } else {
        errors.push(`Payment: ${paymentResult.message}`);
      }
    }

    // Update notifications if any notification fields are provided
    const hasNotificationFields = data.pushNotificationsEnabled !== undefined || 
                                  data.emailNotificationsEnabled !== undefined || 
                                  data.notificationPreferences !== undefined;

    if (hasNotificationFields) {
      const notificationData: UpdateNotificationsDTO = {};
      if (data.pushNotificationsEnabled !== undefined) {
        notificationData.pushNotificationsEnabled = data.pushNotificationsEnabled;
      }
      if (data.emailNotificationsEnabled !== undefined) {
        notificationData.emailNotificationsEnabled = data.emailNotificationsEnabled;
      }
      if (data.notificationPreferences !== undefined) {
        notificationData.notificationPreferences = data.notificationPreferences;
      }

      const notificationResult = await this.updateNotifications(merchantId, notificationData);
      if (notificationResult.status) {
        results.notifications = notificationResult.data;
      } else {
        errors.push(`Notifications: ${notificationResult.message}`);
      }
    }

    // Update preferences if provided
    if (data.storePreferences !== undefined) {
      const preferencesData: UpdatePreferencesDTO = {
        storePreferences: data.storePreferences,
      };

      const preferencesResult = await this.updatePreferences(merchantId, preferencesData);
      if (preferencesResult.status) {
        results.preferences = preferencesResult.data;
      } else {
        errors.push(`Preferences: ${preferencesResult.message}`);
      }
    }

    // If there are errors, return partial success
    if (errors.length > 0) {
      return {
        status: true,
        code: 207, // Multi-Status (partial success)
        message: "Settings updated with some errors",
        data: {
          results,
          errors,
        },
      };
    }

    return {
      status: true,
      code: 200,
      message: "All settings updated successfully",
      data: results,
    };
  }
}
