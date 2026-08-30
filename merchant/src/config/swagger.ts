import swaggerJsdoc from "swagger-jsdoc";
import * as path from "path";
import { applicationConfig } from "../config";

// Use process.cwd() to get the project root (where package.json is)
// This works better with ts-node and different execution contexts
const projectRoot = process.cwd();
const srcPath = path.join(projectRoot, "src");

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Merchant Backend API",
      version: "1.0.0",
      description: "API documentation for Merchant Backend Service",
      contact: {
        name: "QuickMedic Support",
        email: applicationConfig.supportEmail,
      },
    },
    servers: [
      {
        // A relative server URL keeps Swagger Execute on the same scheme and
        // host as the docs page (including Render production), avoiding the
        // mixed-content/CORS failure caused by an HTTP development IP.
        url: "/",
        description: "Current server",
      },
      {
        url: applicationConfig.baseUrl,
        description: "Configured API server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        internalAuth: {
          type: "apiKey",
          in: "header",
          name: "x-internal-signature",
          description:
            "HMAC-SHA256 service-to-service authentication. Also requires x-internal-key-id, x-internal-timestamp, and x-internal-nonce.",
        },
      },
      schemas: {
        SignupRequest: {
          type: "object",
          required: ["email", "name"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "merchant@example.com",
            },
            name: {
              type: "string",
              minLength: 2,
              maxLength: 100,
              example: "John Doe",
            },
          },
        },
        VerifyOtpRequest: {
          type: "object",
          required: ["email", "otp"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Email address used in signup or forgot-password",
              example: "merchant@example.com",
            },
            otp: {
              type: "string",
              pattern: "^\\d{4}$",
              example: "1234",
            },
          },
        },
        CompleteSignupRequest: {
          type: "object",
          required: ["email", "businessName", "phoneNumber", "password", "confirmPassword"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Email address that was verified",
              example: "merchant@example.com",
            },
            businessName: {
              type: "string",
              minLength: 2,
              maxLength: 200,
              example: "ABC Pharmacy",
            },
            phoneNumber: {
              type: "string",
              minLength: 10,
              maxLength: 15,
              example: "+2348012345678",
            },
            password: {
              type: "string",
              minLength: 6,
              example: "password123",
            },
            confirmPassword: {
              type: "string",
              example: "password123",
            },
            licenseUrl: {
              type: "string",
              format: "uri",
              description: "URL of uploaded license file from /upload/single endpoint (optional)",
              example: "https://bucket.s3.region.amazonaws.com/licenses/12345-license.pdf",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "merchant@example.com",
            },
            password: {
              type: "string",
              example: "password123",
            },
          },
        },
        ForgotPasswordRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "merchant@example.com",
            },
          },
        },
        ResetPasswordRequest: {
          type: "object",
          required: ["email", "newPassword", "confirmPassword"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Email address that was verified",
              example: "merchant@example.com",
            },
            newPassword: {
              type: "string",
              minLength: 6,
              example: "newpassword123",
            },
            confirmPassword: {
              type: "string",
              example: "newpassword123",
            },
          },
        },
        RefreshTokenRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string", description: "Refresh token returned by login or a previous refresh." },
          },
        },
        CreateProductRequest: {
          type: "object",
          required: ["name", "category", "brand", "price", "vat", "inventory", "images"],
          properties: {
            name: { type: "string", minLength: 2, maxLength: 255, example: "Paracetamol 500mg" },
            description: { type: "string", maxLength: 2000, example: "Pain relief tablets" },
            category: { type: "string", example: "Pain Relief" },
            brand: { type: "string", example: "Emzor" },
            sku: { type: "string", maxLength: 100, example: "PCM-500-001" },
            price: { type: "number", minimum: 0, example: 1500 },
            vat: { type: "number", minimum: 0, example: 112.5 },
            discountPercentage: { type: "number", minimum: 0, maximum: 100, default: 0, example: 0 },
            minQuantity: { type: "integer", minimum: 1, default: 1, example: 1 },
            maxQuantity: { type: "integer", minimum: 1, default: 100, example: 100 },
            inventory: { type: "integer", minimum: 0, example: 50 },
            images: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: {
                type: "object",
                required: ["url", "order", "isMain"],
                properties: {
                  url: { type: "string", format: "uri", example: "https://cdn.example.com/product.jpg" },
                  order: { type: "integer", minimum: 1, maximum: 3, example: 1 },
                  isMain: { type: "boolean", example: true },
                },
              },
            },
            isActive: { type: "boolean", default: true, example: true },
          },
        },
        UpdateProductRequest: {
          type: "object",
          description: "All fields are optional; send only the fields to change.",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 255 },
            description: { type: "string", maxLength: 2000 },
            category: { type: "string" },
            brand: { type: "string" },
            sku: { type: "string", maxLength: 100 },
            price: { type: "number", minimum: 0 },
            vat: { type: "number", minimum: 0 },
            discountPercentage: { type: "number", minimum: 0, maximum: 100 },
            minQuantity: { type: "integer", minimum: 1 },
            maxQuantity: { type: "integer", minimum: 1 },
            inventory: { type: "integer", minimum: 0 },
            images: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: {
                type: "object",
                required: ["url", "order", "isMain"],
                properties: {
                  url: { type: "string", format: "uri" },
                  order: { type: "integer", minimum: 1, maximum: 3 },
                  isMain: { type: "boolean" },
                },
              },
            },
            isActive: { type: "boolean" },
            status: { type: "string", enum: ["in_stock", "low_stock", "out_of_stock"] },
          },
        },
        UpdateProductStockRequest: {
          type: "object",
          required: ["inventory"],
          properties: { inventory: { type: "integer", minimum: 0, example: 50 } },
        },
        CreateCategoryRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100, example: "Antibiotics" },
            description: { type: "string", maxLength: 500, example: "Prescription medicines" },
          },
        },
        UpdateCategoryRequest: {
          type: "object",
          description: "All fields are optional; send only the fields to change.",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            description: { type: "string", maxLength: 500 },
            isActive: { type: "boolean" },
          },
        },
        CreateDiscountRequest: {
          type: "object",
          required: ["code", "type", "amount", "startDate", "endDate"],
          properties: {
            code: { type: "string", minLength: 3, maxLength: 50, example: "WELCOME10" },
            type: { type: "string", enum: ["fixed_amount", "percentage"], example: "percentage" },
            amount: { type: "number", minimum: 0, example: 10 },
            applyToAllProducts: { type: "boolean", default: false },
            applicableProducts: { type: "array", items: { type: "string", format: "uuid" } },
            applicableCategories: { type: "array", items: { type: "string", example: "Pain Relief" } },
            minOrderAmount: { type: "number", minimum: 0 },
            status: { type: "string", enum: ["active", "inactive"], default: "active" },
            startDate: { type: "string", format: "date-time", example: "2026-08-01T00:00:00.000Z" },
            endDate: { type: "string", format: "date-time", example: "2026-08-31T23:59:59.000Z" },
            usageLimit: { type: "integer", minimum: 1 },
            perUserLimit: { type: "integer", minimum: 1 },
          },
        },
        UpdateDiscountRequest: {
          type: "object",
          description: "All fields are optional; send only the fields to change.",
          properties: {
            code: { type: "string", minLength: 3, maxLength: 50 },
            type: { type: "string", enum: ["fixed_amount", "percentage"] },
            amount: { type: "number", minimum: 0 },
            applyToAllProducts: { type: "boolean" },
            applicableProducts: { type: "array", items: { type: "string", format: "uuid" } },
            applicableCategories: { type: "array", items: { type: "string" } },
            minOrderAmount: { type: "number", minimum: 0 },
            status: { type: "string", enum: ["active", "inactive"] },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            usageLimit: { type: "integer", minimum: 1 },
            perUserLimit: { type: "integer", minimum: 1 },
          },
        },
        ValidateDiscountRequest: {
          type: "object",
          required: ["code", "orderAmount"],
          description: "Provide either productIds or products; productIds is preferred.",
          properties: {
            code: { type: "string", example: "WELCOME10" },
            orderAmount: { type: "number", minimum: 0, example: 5000 },
            productIds: { type: "array", minItems: 1, items: { type: "string", format: "uuid" } },
            products: { type: "array", minItems: 1, items: { type: "string", format: "uuid" } },
          },
        },
        SubscribeRequest: {
          type: "object",
          required: ["planId", "paymentMethod"],
          properties: {
            planId: { type: "string", format: "uuid", example: "3f1b1c9a-6e8b-4b7e-9b1a-1234567890ab" },
            paymentMethod: { type: "string", enum: ["wallet", "card", "bank_transfer"], example: "card" },
            returnUrl: { type: "string", format: "uri", description: "Required for card and bank_transfer payments.", example: "https://app.example.com/subscription/callback" },
          },
        },
        UpgradePlanRequest: {
          type: "object",
          required: ["planId", "paymentMethod"],
          properties: {
            planId: { type: "string", format: "uuid" },
            paymentMethod: { type: "string", enum: ["wallet", "card", "bank_transfer"] },
            returnUrl: { type: "string", format: "uri", description: "Required for card and bank_transfer payments." },
          },
        },
        DowngradePlanRequest: {
          type: "object",
          required: ["planId"],
          properties: { planId: { type: "string", format: "uuid" } },
        },
        ToggleAutoRenewRequest: {
          type: "object",
          required: ["autoRenew"],
          properties: { autoRenew: { type: "boolean", example: true } },
        },
        ConfirmPaymentRequest: {
          type: "object",
          required: ["reference"],
          properties: { reference: { type: "string", example: "sub_123456789" } },
        },
        FundWalletRequest: {
          type: "object",
          required: ["amount"],
          properties: { amount: { type: "integer", minimum: 100, description: "Amount in Naira.", example: 5000 } },
        },
        ConfirmFundingRequest: {
          type: "object",
          required: ["reference"],
          properties: { reference: { type: "string", example: "wf_123456789" } },
        },
        WithdrawWalletRequest: {
          type: "object",
          required: ["amount"],
          properties: {
            amount: { type: "integer", minimum: 100, description: "Amount in Naira.", example: 5000 },
            reason: { type: "string", maxLength: 150, example: "Cash withdrawal" },
          },
        },
        ReviewDrugstorePrescriptionRequest: {
          type: "object",
          required: ["action"],
          properties: {
            action: { type: "string", enum: ["approved", "rejected", "needs_clarification"], example: "approved" },
            note: { type: "string", description: "Optional review note." },
          },
        },
        DrugstoreOrderStatusRequest: {
          type: "object",
          required: ["deliveryStatus"],
          properties: {
            deliveryStatus: { type: "string", enum: ["pending", "picked_up", "in_transit", "delivered", "cancelled"], example: "in_transit" },
            note: { type: "string", description: "Optional status note." },
          },
        },
        ValidateInternalDiscountRequest: {
          type: "object",
          required: ["merchantId", "code", "orderAmount", "productIds"],
          properties: {
            merchantId: { type: "string", format: "uuid" },
            code: { type: "string", example: "WELCOME10" },
            orderAmount: { type: "number", minimum: 0, example: 5000 },
            productIds: { type: "array", minItems: 1, items: { type: "string", format: "uuid" } },
          },
        },
        ReflectDrugstoreOrderRequest: {
          type: "object",
          required: ["sourceOrderId", "sourceSyncKey", "paymentReference", "merchantId", "user", "amounts", "delivery", "items"],
          properties: {
            sourceOrderId: { type: "string", format: "uuid" },
            sourceSyncKey: { type: "string" },
            paymentReference: { type: "string" },
            paymentVerifiedAt: { type: "string", format: "date-time" },
            paymentStatus: { type: "string", enum: ["pending", "paid", "failed"] },
            deliveryStatus: { type: "string", enum: ["pending", "picked_up", "in_transit", "delivered", "cancelled"] },
            merchantId: { type: "string", format: "uuid" },
            fulfillmentMethod: { type: "string", enum: ["delivery", "pickup"] },
            user: { type: "object", required: ["id", "role"], properties: { id: { type: "integer" }, role: { type: "string", enum: ["consumer", "doctor"] } } },
            amounts: {
              type: "object",
              required: ["subtotal", "vatTotal", "discountTotal", "deliveryFee", "totalAmount", "currency"],
              properties: {
                subtotal: { type: "number" }, vatTotal: { type: "number" }, discountTotal: { type: "number" }, deliveryFee: { type: "number" }, totalAmount: { type: "number" }, currency: { type: "string", example: "NGN" },
              },
            },
            delivery: {
              type: "object",
              required: ["recipientName", "recipientPhone", "addressLine1", "city", "state"],
              properties: {
                recipientName: { type: "string" }, recipientPhone: { type: "string" }, addressLine1: { type: "string" }, addressLine2: { type: "string", nullable: true }, city: { type: "string" }, state: { type: "string" }, landmark: { type: "string", nullable: true }, deliveryNote: { type: "string", nullable: true }, deliveryDate: { type: "string", nullable: true }, deliveryTimeSlot: { type: "string", nullable: true },
              },
            },
            discount: { type: "object", properties: { code: { type: "string", nullable: true }, discountId: { type: "string", format: "uuid", nullable: true } } },
            items: { type: "array", minItems: 1, items: { type: "object", properties: { merchantProductId: { type: "string", format: "uuid" }, productNameSnapshot: { type: "string" }, quantity: { type: "integer" }, unitPriceSnapshot: { type: "number" }, vatSnapshot: { type: "number" }, discountPercentageSnapshot: { type: "number" }, lineSubtotal: { type: "number" }, lineVatTotal: { type: "number" }, lineDiscountTotal: { type: "number" }, lineTotal: { type: "number" } }, required: ["merchantProductId", "productNameSnapshot", "quantity", "unitPriceSnapshot", "vatSnapshot", "discountPercentageSnapshot", "lineSubtotal", "lineVatTotal", "lineDiscountTotal", "lineTotal"] } },
            placedAt: { type: "string", format: "date-time" },
          },
        },
        UpdateProfileRequest: {
          type: "object",
          description: "All fields are optional; send only the fields to change.",
          properties: {
            firstName: { type: "string", minLength: 2, maxLength: 50 }, lastName: { type: "string", minLength: 2, maxLength: 50 }, phoneNumber: { type: "string", pattern: "^[0-9]{7,15}$" }, phoneCountryCode: { type: "string" },
          },
        },
        UpdateStoreRequest: {
          type: "object",
          description: "All fields are optional; send only the fields to change.",
          properties: {
            businessName: { type: "string", minLength: 2, maxLength: 100 }, businessUrl: { type: "string", maxLength: 200 }, businessAddress: { type: "string", maxLength: 255 }, city: { type: "string", maxLength: 100 }, state: { type: "string", maxLength: 100 }, landmark: { type: "string", maxLength: 255 }, openHour: { type: "string", pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$", example: "08:00" }, closeHour: { type: "string", pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$", example: "20:00" }, vacation: { type: "boolean" }, vacationStartDate: { type: "string", format: "date-time", nullable: true }, vacationEndDate: { type: "string", format: "date-time", nullable: true }, storeDescription: { type: "string", maxLength: 500 }, storeBannerUrl: { type: "string", format: "uri" },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          required: ["currentPassword", "newPassword", "confirmPassword"],
          properties: {
            currentPassword: { type: "string" }, newPassword: { type: "string", minLength: 8, description: "Must include uppercase, lowercase, number, and special character." }, confirmPassword: { type: "string" },
          },
        },
        UpdatePaymentRequest: {
          type: "object",
          required: ["bankCode", "accountNumber", "accountName"],
          properties: { bankCode: { type: "string", example: "058" }, accountNumber: { type: "string", pattern: "^[0-9]{10}$", example: "0123456789" }, accountName: { type: "string", example: "ABC Pharmacy" } },
        },
        NotificationChannelPreferenceRequest: {
          type: "object",
          description: "All fields are optional and are deep-merged into the existing preference. For the current web-push MVP, desktop controls browser push delivery; email and sms are stored for their respective channels.",
          properties: {
            email: { type: "boolean", description: "Enable or disable email notifications for this event." },
            sms: { type: "boolean", description: "Enable or disable SMS notifications for this event." },
            desktop: { type: "boolean", description: "Enable or disable browser push notifications for this event." },
          },
        },
        RegisterMerchantDeviceTokenRequest: {
          type: "object",
          description: "Registers or refreshes one browser profile for the authenticated merchant. Reusing the same deviceId updates the stored FCM token instead of creating a duplicate.",
          required: ["deviceId", "token"],
          properties: {
            deviceId: {
              type: "string",
              minLength: 1,
              maxLength: 255,
              description: "A stable, frontend-generated identifier for this browser profile (for example, a UUID kept in localStorage). This is not the FCM token.",
              example: "a5ce5631-351c-4a86-9b58-c5523f738d61",
            },
            token: {
              type: "string",
              minLength: 1,
              maxLength: 4096,
              description: "The current FCM registration token returned by Firebase getToken(). Send it again whenever Firebase returns a new token.",
              example: "fcm-web-registration-token",
            },
            platform: {
              type: "string",
              enum: ["web"],
              default: "web",
              description: "Optional. Web is the only supported platform and is enforced by the backend.",
            },
            browser: {
              type: "string",
              maxLength: 100,
              nullable: true,
              description: "Optional browser label for support diagnostics, such as Chrome or Firefox.",
              example: "Chrome",
            },
            userAgent: {
              type: "string",
              maxLength: 1000,
              nullable: true,
              description: "Optional navigator.userAgent value for support diagnostics.",
            },
          },
        },
        UpdateNotificationsRequest: {
          type: "object",
          description: "Partial update. Omitted fields remain unchanged. Browser push requires pushNotificationsEnabled to be true; notificationPreferences.<event>.desktop can then opt individual events in or out.",
          properties: {
            pushNotificationsEnabled: {
              type: "boolean",
              description: "Global master switch for all merchant browser push notifications. It must be true before a test or event notification can be sent.",
              example: true,
            },
            emailNotificationsEnabled: { type: "boolean", description: "Global master switch for merchant email notifications.", example: true },
            notificationPreferences: {
              type: "object",
              description: "Per-event channel preferences. Each nested object is merged, so send only the event and channels that are changing.",
              properties: {
                orderPlaced: { allOf: [{ $ref: "#/components/schemas/NotificationChannelPreferenceRequest" }], description: "New online order is reflected into the merchant account." },
                walletFunded: { allOf: [{ $ref: "#/components/schemas/NotificationChannelPreferenceRequest" }], description: "Wallet funding is settled successfully." },
                offlineSaleRecorded: { allOf: [{ $ref: "#/components/schemas/NotificationChannelPreferenceRequest" }], description: "A new offline/in-store sale is recorded." },
                lowStock: { $ref: "#/components/schemas/NotificationChannelPreferenceRequest" },
                payoutAlert: { $ref: "#/components/schemas/NotificationChannelPreferenceRequest" },
                supportTicket: { $ref: "#/components/schemas/NotificationChannelPreferenceRequest" },
              },
            },
          },
        },
        UpdatePreferencesRequest: {
          type: "object",
          properties: {
            storePreferences: { type: "object", properties: { acceptOrdersAutomatically: { type: "boolean" }, requireManualApprovalForPrescriptions: { type: "boolean" }, allowOutOfStockAlternatives: { type: "boolean" }, autoHideOutOfStock: { type: "boolean" }, enablePharmacyPickup: { type: "boolean" }, enableInHouseDelivery: { type: "boolean" }, deliveryRadius: { type: "number", minimum: 0, nullable: true }, deliveryFeeType: { type: "string", enum: ["flat", "distance-based"] }, deliveryFlatFee: { type: "number", minimum: 0, nullable: true }, deliveryPricePerKm: { type: "number", minimum: 0, nullable: true }, deliveryMinKm: { type: "number", minimum: 0, nullable: true }, deliveryStartTime: { type: "string", nullable: true }, deliveryEndTime: { type: "string", nullable: true }, lowStockThreshold: { type: "integer", minimum: 1 }, showLowStockLabel: { type: "boolean" } } },
          },
        },
        UpdateAllSettingsRequest: {
          type: "object",
          description: "Unified update; all fields are optional. If any payment field is provided, provide all three payment fields.",
          properties: {
            firstName: { type: "string" }, lastName: { type: "string" }, phoneNumber: { type: "string" }, phoneCountryCode: { type: "string" }, businessName: { type: "string" }, businessUrl: { type: "string" }, businessAddress: { type: "string" }, city: { type: "string" }, state: { type: "string" }, landmark: { type: "string" }, openHour: { type: "string" }, closeHour: { type: "string" }, vacation: { type: "boolean" }, vacationStartDate: { type: "string", format: "date-time", nullable: true }, vacationEndDate: { type: "string", format: "date-time", nullable: true }, storeDescription: { type: "string" }, storeBannerUrl: { type: "string", format: "uri" }, bankCode: { type: "string" }, accountNumber: { type: "string", pattern: "^[0-9]{10}$" }, accountName: { type: "string" }, pushNotificationsEnabled: { type: "boolean" }, emailNotificationsEnabled: { type: "boolean" }, notificationPreferences: { type: "object" }, storePreferences: { type: "object" },
          },
        },
        UploadProfilePictureRequest: {
          type: "object",
          required: ["profilePictureUrl"],
          properties: { profilePictureUrl: { type: "string", format: "uri", example: "https://cdn.example.com/profile.jpg" } },
        },
        UploadValidIdRequest: {
          type: "object",
          required: ["validIdUrl"],
          properties: { validIdUrl: { type: "string", format: "uri", example: "https://cdn.example.com/id.pdf" } },
        },
        VerifyBankAccountRequest: {
          type: "object",
          required: ["bankCode", "accountNumber", "accountName"],
          properties: { bankCode: { type: "string", example: "058" }, accountNumber: { type: "string", pattern: "^[0-9]{10}$", example: "0123456789" }, accountName: { type: "string", minLength: 3, maxLength: 100, example: "ABC Pharmacy" } },
        },
        ContactSupportRequest: {
          type: "object",
          required: ["name", "email", "subject", "message"],
          properties: { name: { type: "string", minLength: 2, maxLength: 100 }, email: { type: "string", format: "email" }, subject: { type: "string", minLength: 3, maxLength: 200 }, message: { type: "string", minLength: 10, maxLength: 2000 } },
        },
        UploadSingleRequest: {
          type: "object",
          required: ["file"],
          properties: {
            file: { type: "string", format: "binary", description: "The file to upload." },
            folder: { type: "string", default: "general", example: "products" },
          },
        },
        UploadBulkRequest: {
          type: "object",
          required: ["files"],
          properties: {
            files: { type: "array", items: { type: "string", format: "binary" }, description: "Files to upload." },
            folder: { type: "string", default: "general", example: "products" },
          },
        },
        PaystackWebhookRequest: {
          type: "object",
          required: ["event", "data"],
          properties: {
            event: { type: "string", example: "charge.success" },
            data: { type: "object", properties: { reference: { type: "string" }, status: { type: "string" }, amount: { type: "number" }, currency: { type: "string" }, metadata: { type: "object" } } },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            status: {
              type: "number",
              example: 200,
            },
            message: {
              type: "string",
              example: "Operation successful",
            },
            data: {
              type: "object",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: {
              type: "number",
              example: 400,
            },
            message: {
              type: "string",
              example: "Error message",
            },
            data: {
              type: "object",
              nullable: true,
            },
          },
        },
        Merchant: {
          type: "object",
          description: "Full merchant summary returned by login and refresh-token.",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", example: "merchant@example.com" },
            firstName: { type: "string", example: "John" },
            lastName: { type: "string", example: "Doe" },
            fullName: { type: "string", example: "John Doe" },
            businessName: { type: "string", nullable: true, example: "ABC Pharmacy" },
            phoneNumber: { type: "string", example: "+2348012345678" },
            isVerified: { type: "boolean", example: true },
          },
        },
        MerchantSummary: {
          type: "object",
          description: "Minimal merchant record returned by complete-signup, before store/settings are filled in.",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", example: "merchant@example.com" },
            firstName: { type: "string", example: "" },
            lastName: { type: "string", example: "" },
            phoneNumber: { type: "string", example: "+2348012345678" },
            isVerified: { type: "boolean", example: true },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            token: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            merchant: {
              $ref: "#/components/schemas/Merchant",
            },
          },
        },
        MessageOnlyResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "Used where the endpoint confirms an action but returns no meaningful payload.",
              properties: { data: { type: "object", nullable: true, example: null } },
            },
          ],
        },
        SignupResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  nullable: true,
                  description: "null in production. Outside production only, contains the OTP as a local-dev convenience since email delivery may be skipped.",
                  properties: {
                    otp: { type: "string", example: "1234" },
                  },
                },
              },
            },
          ],
        },
        ForgotPasswordResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "Always responds success whether or not the email exists, so account existence cannot be enumerated.",
              properties: {
                data: {
                  type: "object",
                  nullable: true,
                  description: "null in production, or when the email does not exist. Outside production only, contains the OTP as a local-dev convenience.",
                  properties: {
                    otp: { type: "string", example: "1234" },
                  },
                },
              },
            },
          ],
        },
        CompleteSignupResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    merchant: { $ref: "#/components/schemas/MerchantSummary" },
                  },
                },
              },
            },
          ],
        },
        MerchantLoginResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    merchant: { $ref: "#/components/schemas/Merchant" },
                    onboarding: {
                      type: "object",
                      properties: {
                        completed: { type: "boolean" },
                        currentStep: { type: "string", nullable: true },
                        progress: {
                          type: "object",
                          properties: {
                            validId: { type: "boolean" },
                            profile: { type: "boolean" },
                            bank: { type: "boolean" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        InternalListProductsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    products: { type: "array", items: { $ref: "#/components/schemas/Product" } },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "number" },
                        page: { type: "number" },
                        limit: { type: "number" },
                        totalPages: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        InternalProductResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { $ref: "#/components/schemas/Product" } } },
          ],
        },
        InternalDistinctBrandsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { type: "object", properties: { brands: { type: "array", items: { type: "string" } } } } } },
          ],
        },
        InternalTopSellingProductsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "Cross-pharmacy — ranked by cumulative purchaseCount across all merchants, no merchantId filter.",
              properties: { data: { type: "object", properties: { products: { type: "array", items: { $ref: "#/components/schemas/Product" } } } } },
            },
          ],
        },
        InternalCategoriesResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Category" } } } },
          ],
        },
        PharmacyRatingSummary: {
          type: "object",
          description: "Reviews are not yet implemented on the merchant side — always zero.",
          properties: { averageRating: { type: "number", example: 0 }, reviewCount: { type: "number", example: 0 } },
        },
        InternalNearbyPharmaciesResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          businessName: { type: "string" },
                          profilePictureUrl: { type: "string", nullable: true },
                          bannerUrl: { type: "string", nullable: true },
                          businessAddress: { type: "string", nullable: true },
                          city: { type: "string", nullable: true },
                          state: { type: "string", nullable: true },
                          landmark: { type: "string", nullable: true },
                          openHour: { type: "string", nullable: true },
                          closeHour: { type: "string", nullable: true },
                          isOpen: { type: "boolean", description: "true unless the store is on vacation." },
                          deliveryFeePreview: { type: "number" },
                          supportsDelivery: { type: "boolean" },
                          supportsPickup: { type: "boolean" },
                          ratingSummary: { $ref: "#/components/schemas/PharmacyRatingSummary" },
                          cartCompatibility: {
                            type: "object",
                            nullable: true,
                            description: "Non-null only when the caller passed this pharmacy's ID in activeCarts.",
                            properties: {
                              supported: { type: "boolean", example: true },
                              itemCount: { type: "number" },
                              subtotal: { type: "number" },
                            },
                          },
                        },
                      },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "number" },
                        page: { type: "number" },
                        limit: { type: "number" },
                        totalPages: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        InternalPharmacyProfileResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    businessName: { type: "string" },
                    description: { type: "string" },
                    bannerUrl: { type: "string", nullable: true },
                    profilePictureUrl: { type: "string", nullable: true },
                    phoneNumber: { type: "string" },
                    address: {
                      type: "object",
                      properties: {
                        line1: { type: "string", nullable: true },
                        city: { type: "string", nullable: true },
                        state: { type: "string", nullable: true },
                        landmark: { type: "string", nullable: true },
                      },
                    },
                    operations: {
                      type: "object",
                      properties: {
                        openHour: { type: "string", nullable: true },
                        closeHour: { type: "string", nullable: true },
                        isOnVacation: { type: "boolean" },
                        supportsDelivery: { type: "boolean" },
                        supportsPickup: { type: "boolean" },
                      },
                    },
                    settings: {
                      type: "object",
                      properties: {
                        enableInHouseDelivery: { type: "boolean" },
                        enablePharmacyPickup: { type: "boolean" },
                        deliveryFeeType: { type: "string", enum: ["flat", "distance-based"] },
                        deliveryFlatFee: { type: "number" },
                        deliveryPricePerKm: { type: "number" },
                      },
                    },
                    ratingSummary: { $ref: "#/components/schemas/PharmacyRatingSummary" },
                  },
                },
              },
            },
          ],
        },
        InternalPharmacyReviewsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "Stub implementation — items is currently always empty and pagination.total/totalPages are always 0.",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { type: "object" } },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "number", example: 0 },
                        page: { type: "number" },
                        limit: { type: "number" },
                        totalPages: { type: "number", example: 0 },
                      },
                    },
                    summary: { $ref: "#/components/schemas/PharmacyRatingSummary" },
                  },
                },
              },
            },
          ],
        },
        InternalReflectOrderResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "Idempotent — replaying the same sourceOrderId/sourceSyncKey returns the existing order with idempotent: true instead of creating a duplicate.",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    merchantOrderId: { type: "string", format: "uuid" },
                    sourceOrderId: { type: "string", format: "uuid" },
                    idempotent: { type: "boolean" },
                  },
                },
              },
            },
          ],
        },
        MerchantDrugstorePrescription: {
          type: "object",
          description: "Passthrough of experience_1's internal prescription record — the merchant service proxies this from experience_1, it does not store prescriptions itself.",
          properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "number" },
            cartId: { type: "string", format: "uuid", nullable: true },
            merchantId: { type: "string", format: "uuid" },
            orderId: { type: "string", format: "uuid", nullable: true },
            fileUrl: { type: "string" },
            fileKey: { type: "string" },
            fileName: { type: "string" },
            fileMimeType: { type: "string" },
            fileSize: { type: "number", nullable: true },
            patientName: { type: "string", nullable: true },
            prescriptionDate: { type: "string", format: "date", nullable: true },
            isForSelf: { type: "boolean" },
            status: { type: "string", enum: ["uploaded", "submitted", "needs_clarification", "approved", "rejected"] },
            merchantNote: { type: "string", nullable: true },
            reviewedByMerchantId: { type: "string", format: "uuid", nullable: true },
            reviewedByMerchantName: { type: "string", nullable: true },
            submittedAt: { type: "string", format: "date-time", nullable: true },
            reviewedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ListDrugstorePrescriptionsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "data is a plain array, not wrapped in an items/pagination envelope.",
              properties: { data: { type: "array", items: { $ref: "#/components/schemas/MerchantDrugstorePrescription" } } },
            },
          ],
        },
        ReviewDrugstorePrescriptionResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { $ref: "#/components/schemas/MerchantDrugstorePrescription" } } },
          ],
        },
        DrugstoreOrderItemRow: {
          type: "object",
          description: "Raw order-item row (product details are snapshotted at order time, not live product data).",
          properties: {
            id: { type: "string", format: "uuid" },
            orderId: { type: "string", format: "uuid" },
            merchantProductId: { type: "string", format: "uuid" },
            skuSnapshot: { type: "string", nullable: true },
            productNameSnapshot: { type: "string" },
            descriptionSnapshot: { type: "string", nullable: true },
            brandSnapshot: { type: "string", nullable: true },
            categorySnapshot: { type: "string", nullable: true },
            imageUrlSnapshot: { type: "string", nullable: true },
            unitPriceSnapshot: { type: "number" },
            vatSnapshot: { type: "number" },
            discountPercentageSnapshot: { type: "number" },
            requiresPrescriptionSnapshot: { type: "boolean" },
            quantity: { type: "number" },
            lineSubtotal: { type: "number" },
            lineVatTotal: { type: "number" },
            lineDiscountTotal: { type: "number" },
            lineTotal: { type: "number" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        DrugstoreOrderRow: {
          type: "object",
          description: "Raw online drugstore order row returned by /drugstore-orders. In-store sales are served by /in-store-sales.",
          properties: {
            id: { type: "string", format: "uuid" },
            merchantId: { type: "string", format: "uuid" },
            fulfillmentMethod: { type: "string", enum: ["delivery", "pickup"] },
            sourceOrderId: { type: "string", format: "uuid" },
            sourceSyncKey: { type: "string" },
            paymentReference: { type: "string" },
            sourceUserId: { type: "number", description: "0 for in-store sales, which have no experience_1 user." },
            sourceUserRole: { type: "string", enum: ["consumer", "doctor"] },
            paymentVerifiedAt: { type: "string", format: "date-time" },
            paymentStatus: { type: "string", enum: ["pending", "paid", "failed"] },
            deliveryStatus: { type: "string", enum: ["pending", "picked_up", "in_transit", "delivered", "cancelled"] },
            isInstoreSales: { type: "boolean" },
            placedAt: { type: "string", format: "date-time" },
            subtotal: { type: "number" },
            vatTotal: { type: "number" },
            discountTotal: { type: "number" },
            deliveryFee: { type: "number" },
            totalAmount: { type: "number" },
            currency: { type: "string", example: "NGN" },
            discountCode: { type: "string", nullable: true },
            discountId: { type: "string", format: "uuid", nullable: true },
            recipientName: { type: "string", nullable: true, description: "null for pickup orders." },
            recipientPhone: { type: "string", nullable: true },
            addressLine1: { type: "string", nullable: true },
            addressLine2: { type: "string", nullable: true },
            city: { type: "string", nullable: true },
            state: { type: "string", nullable: true },
            landmark: { type: "string", nullable: true },
            deliveryNote: { type: "string", nullable: true },
            deliveryDate: { type: "string", format: "date", nullable: true },
            deliveryTimeSlot: { type: "string", nullable: true },
            status: { type: "string", enum: ["new", "processing", "ready", "delivered", "cancelled"], description: "Legacy status mirror of deliveryStatus." },
            metadata: { type: "object" },
            items: { type: "array", items: { $ref: "#/components/schemas/DrugstoreOrderItemRow" } },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        DrugstoreOrderListResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/DrugstoreOrderRow" } },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "number" },
                        page: { type: "number" },
                        limit: { type: "number" },
                        totalPages: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        DrugstoreOrderRowResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { $ref: "#/components/schemas/DrugstoreOrderRow" } } },
          ],
        },
        SeedDrugstoreOrdersResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "Only available in development/staging. 403 outside those environments; 409 if this merchant was already seeded.",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    merchantId: { type: "string", format: "uuid" },
                    seeded: { type: "boolean", example: true },
                    productsCreated: { type: "number", description: "Sample products created because the merchant had none." },
                    ordersCreated: { type: "number" },
                    sampleOrderIds: { type: "array", items: { type: "string", format: "uuid" } },
                  },
                },
              },
            },
          ],
        },
        AnalyticsTimeWindow: {
          type: "object",
          properties: {
            range: { type: "string", nullable: true, description: "null when isCustom is true." },
            isCustom: { type: "boolean" },
            startAt: { type: "string", format: "date-time" },
            endAt: { type: "string", format: "date-time" },
            previousStartAt: { type: "string", format: "date-time", description: "Start of the equivalent prior period, used for growthPercentage comparisons." },
            previousEndAt: { type: "string", format: "date-time" },
          },
        },
        AnalyticsMetricWithGrowth: {
          type: "object",
          properties: {
            value: { type: "number" },
            growthPercentage: { type: "number", nullable: true, description: "Percentage change vs the equivalent prior period; null if the prior period had no baseline." },
          },
        },
        AnalyticsKpisResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    range: { type: "string", nullable: true },
                    timeWindow: { $ref: "#/components/schemas/AnalyticsTimeWindow" },
                    commissionRate: { type: "number", description: "Fraction, e.g. 0.05 for 5%." },
                    metrics: {
                      type: "object",
                      properties: {
                        totalEarned: { $ref: "#/components/schemas/AnalyticsMetricWithGrowth" },
                        totalCommission: { $ref: "#/components/schemas/AnalyticsMetricWithGrowth" },
                        totalOrders: { $ref: "#/components/schemas/AnalyticsMetricWithGrowth" },
                        onlineOrders: {
                          $ref: "#/components/schemas/AnalyticsMetricWithGrowth",
                          description: "Online orders in the selected dashboard window.",
                        },
                        inStoreOrders: {
                          $ref: "#/components/schemas/AnalyticsMetricWithGrowth",
                          description: "In-store orders in the selected dashboard window.",
                        },
                        totalProducts: { $ref: "#/components/schemas/AnalyticsMetricWithGrowth" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        AnalyticsSalesSeriesResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    range: { type: "string", nullable: true },
                    timeWindow: { $ref: "#/components/schemas/AnalyticsTimeWindow" },
                    series: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          key: { type: "string" },
                          label: { type: "string" },
                          salesAmount: { type: "number" },
                          orderCount: { type: "number" },
                          uniqueUsers: { type: "number" },
                        },
                      },
                    },
                    totals: {
                      type: "object",
                      properties: {
                        salesAmount: { type: "number" },
                        orderCount: { type: "number" },
                        uniqueUsers: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        AnalyticsOrderBreakdownResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    range: { type: "string", nullable: true },
                    timeWindow: { $ref: "#/components/schemas/AnalyticsTimeWindow" },
                    totalOrders: { type: "number" },
                    trackedTotal: { type: "number", description: "Orders whose deliveryStatus is pending, delivered, or cancelled (excludes picked_up/in_transit)." },
                    counts: {
                      type: "object",
                      properties: { pending: { type: "number" }, delivered: { type: "number" }, cancelled: { type: "number" } },
                    },
                    percentages: {
                      type: "object",
                      properties: { pending: { type: "number" }, delivered: { type: "number" }, cancelled: { type: "number" } },
                    },
                  },
                },
              },
            },
          ],
        },
        AnalyticsTopSellingProductsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    period: { type: "string", nullable: true, description: "null when range/startDate/endDate filters were used instead of a named period." },
                    range: { type: "string", nullable: true },
                    startAt: { type: "string", format: "date-time", nullable: true },
                    endAt: { type: "string", format: "date-time", nullable: true },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          rank: { type: "number" },
                          merchantProductId: { type: "string", format: "uuid" },
                          productName: { type: "string" },
                          quantitySold: { type: "number" },
                          totalAmount: { type: "number" },
                          orderCount: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        AnalyticsRecentProductSalesResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    range: { type: "string", nullable: true },
                    timeWindow: { $ref: "#/components/schemas/AnalyticsTimeWindow" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          orderId: { type: "string", format: "uuid" },
                          sourceOrderId: { type: "string", format: "uuid", nullable: true },
                          customerName: { type: "string", nullable: true },
                          productName: { type: "string" },
                          quantity: { type: "number" },
                          amount: { type: "number" },
                          placedAt: { type: "string", format: "date-time", nullable: true },
                        },
                      },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "number" },
                        page: { type: "number" },
                        limit: { type: "number" },
                        totalPages: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        DrugstoreDashboardResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "Bundles one call each to KPIs, sales trend, order breakdown, top 5 selling products, and the 5 most recent product sales.",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    filters: { $ref: "#/components/schemas/AnalyticsTimeWindow" },
                    kpis: {
                      type: "object",
                      properties: {
                        totalEarned: { $ref: "#/components/schemas/AnalyticsMetricWithGrowth" },
                        totalCommission: { $ref: "#/components/schemas/AnalyticsMetricWithGrowth" },
                        totalOrders: { $ref: "#/components/schemas/AnalyticsMetricWithGrowth" },
                        onlineOrders: {
                          $ref: "#/components/schemas/AnalyticsMetricWithGrowth",
                          description: "Online orders in the selected dashboard window.",
                        },
                        inStoreOrders: {
                          $ref: "#/components/schemas/AnalyticsMetricWithGrowth",
                          description: "In-store orders in the selected dashboard window.",
                        },
                        totalProducts: { $ref: "#/components/schemas/AnalyticsMetricWithGrowth" },
                      },
                    },
                    salesTrend: { type: "object", description: "Same shape as AnalyticsSalesSeriesResponse's data." },
                    orderBreakdown: { type: "object", description: "Same shape as AnalyticsOrderBreakdownResponse's data." },
                    topSellingProducts: { type: "object", description: "Same shape as AnalyticsTopSellingProductsResponse's data, capped at 5 items." },
                    recentProductSales: { type: "object", description: "Same shape as AnalyticsRecentProductSalesResponse's data, page 1 limit 5." },
                  },
                },
              },
            },
          ],
        },
        InStoreSaleItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid" },
            name: { type: "string" },
            sku: { type: "string", nullable: true },
            brand: { type: "string", nullable: true },
            category: { type: "string", nullable: true },
            imageUrl: { type: "string", nullable: true },
            quantity: { type: "number" },
            unitPrice: { type: "number" },
            vat: { type: "number" },
            discountPercentage: { type: "number" },
            subtotal: { type: "number" },
            vatTotal: { type: "number" },
            discountTotal: { type: "number" },
            totalAmount: { type: "number" },
            amount: { type: "number", description: "Same value as totalAmount." },
            requiresPrescription: { type: "boolean" },
          },
        },
        InStoreSaleResolution: {
          type: "object",
          description: "Tracks cancellation/return/refund state layered on top of the base sale.",
          properties: {
            status: { type: "string", enum: ["active", "cancelled", "partially_returned", "returned"] },
            refundStatus: { type: "string", enum: ["not_required", "pending", "partially_refunded", "completed"] },
            expectedRefundAmount: { type: "number" },
            refundedAmount: { type: "number" },
            refundableAmount: { type: "number", description: "max(0, expectedRefundAmount - refundedAmount)." },
            returnedQuantities: { type: "object", additionalProperties: { type: "number" }, description: "Keyed by orderItemId." },
            cancellation: {
              type: "object",
              nullable: true,
              properties: {
                reason: { type: "string" },
                cancelledAt: { type: "string", format: "date-time" },
                cancelledByMerchantId: { type: "string", format: "uuid" },
                inventoryRestoredQuantity: { type: "number" },
                inventoryRestoredAt: { type: "string", format: "date-time" },
              },
            },
            returns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  returnId: { type: "string", format: "uuid" },
                  reason: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        orderItemId: { type: "string", format: "uuid" },
                        productId: { type: "string", format: "uuid" },
                        productName: { type: "string" },
                        quantity: { type: "number" },
                        condition: { type: "string", enum: ["resalable", "damaged"] },
                        refundAmount: { type: "number" },
                        inventoryRestored: { type: "boolean" },
                      },
                    },
                  },
                  refundAmount: { type: "number" },
                  inventoryRestoredQuantity: { type: "number" },
                  returnedAt: { type: "string", format: "date-time" },
                  returnedByMerchantId: { type: "string", format: "uuid" },
                },
              },
            },
            refunds: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  refundId: { type: "string", format: "uuid" },
                  amount: { type: "number" },
                  method: { type: "string", enum: ["cash", "pos", "bank_transfer", "other"] },
                  reference: { type: "string", nullable: true },
                  note: { type: "string", nullable: true },
                  refundedAt: { type: "string", format: "date-time" },
                  refundedByMerchantId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        InStoreSale: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            orderId: { type: "string", description: "Human-facing IS-... display ID.", example: "IS-A1B2C3D4" },
            sourceOrderId: { type: "string", format: "uuid" },
            customerName: { type: "string", example: "Walk-in Customer" },
            customerPhone: { type: "string", nullable: true },
            orderDate: { type: "string", format: "date-time" },
            date: { type: "string", example: "06/08/2026", description: "DD/MM/YYYY in the store's timezone." },
            time: { type: "string", example: "10:30 AM" },
            timezone: { type: "string", example: "Africa/Lagos" },
            itemQty: { type: "number", description: "Sum of all item quantities." },
            paymentStatus: { type: "string", enum: ["pending", "paid", "failed"] },
            paymentStatusLabel: { type: "string", example: "Paid" },
            deliveryStatus: { type: "string", enum: ["pending", "picked_up", "in_transit", "delivered", "cancelled"] },
            deliveryStatusLabel: { type: "string", example: "Completed", description: "\"Completed\" when deliveryStatus is delivered, otherwise a title-cased version of deliveryStatus." },
            totalAmount: { type: "number" },
            subtotal: { type: "number" },
            vatTotal: { type: "number" },
            discountTotal: { type: "number" },
            deliveryFee: { type: "number", example: 0 },
            currency: { type: "string", example: "NGN" },
            note: { type: "string", nullable: true },
            fulfillmentMethod: { type: "string", example: "pickup" },
            isInstoreSales: { type: "boolean", example: true },
            resolution: { $ref: "#/components/schemas/InStoreSaleResolution" },
            items: { type: "array", items: { $ref: "#/components/schemas/InStoreSaleItem" } },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        InStoreSaleResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { $ref: "#/components/schemas/InStoreSale" } } },
          ],
        },
        InStoreSaleListResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/InStoreSale" } },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "number" },
                        page: { type: "number" },
                        limit: { type: "number" },
                        totalPages: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        InStoreSaleProductOption: {
          type: "object",
          description: "A product formatted for the point-of-sale product picker, with pricing already computed.",
          properties: {
            id: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid", description: "Same value as id." },
            name: { type: "string" },
            sku: { type: "string", nullable: true },
            brand: { type: "string" },
            category: { type: "string" },
            imageUrl: { type: "string", nullable: true },
            unitPrice: { type: "number" },
            vat: { type: "number" },
            discountPercentage: { type: "number" },
            totalUnitPrice: { type: "number", description: "Discounted price + VAT for one unit." },
            inventory: { type: "number" },
            minQuantity: { type: "number" },
            maxQuantity: { type: "number" },
            requiresPrescription: { type: "boolean" },
          },
        },
        InStoreSaleProductOptionsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/InStoreSaleProductOption" } } } },
          ],
        },
        Wallet: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            balance: { type: "number", description: "In kobo (₦1 = 100 kobo).", example: 500000 },
            balanceInNaira: { type: "number", example: 5000 },
            currency: { type: "string", example: "NGN" },
          },
        },
        GetWalletResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { $ref: "#/components/schemas/Wallet" } } },
          ],
        },
        FundWalletResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "Redirect the merchant to authorizationUrl to complete payment. A successful Paystack webhook credits the wallet automatically; POST /wallet/confirm-funding remains available as a redirect/callback fallback.",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    authorizationUrl: { type: "string", format: "uri" },
                    accessCode: { type: "string" },
                    reference: { type: "string" },
                    amount: { type: "number", description: "In kobo." },
                    amountInNaira: { type: "number" },
                  },
                },
              },
            },
          ],
        },
        ConfirmFundingResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    wallet: {
                      type: "object",
                      properties: {
                        balance: { type: "number", description: "In kobo." },
                        balanceInNaira: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        WithdrawWalletResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "status may be 'pending' (queued at Paystack) or reflect the final transfer outcome.",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    reference: { type: "string" },
                    transferCode: { type: "string" },
                    status: { type: "string" },
                    amount: { type: "number", description: "In kobo." },
                    amountInNaira: { type: "number" },
                    destination: {
                      type: "object",
                      properties: {
                        bankName: { type: "string" },
                        accountName: { type: "string" },
                        accountNumberLast4: { type: "string", example: "6789" },
                      },
                    },
                    wallet: {
                      type: "object",
                      properties: {
                        balance: { type: "number", description: "In kobo." },
                        balanceInNaira: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        WalletTransaction: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            type: {
              type: "string",
              enum: ["wallet_funding", "wallet_debit", "subscription_payment"],
              description: "Full set defined by TransactionType — wallet funding, manual withdrawal debits, and subscription payments made from wallet balance.",
            },
            amount: { type: "number", description: "In kobo." },
            amountInNaira: { type: "number" },
            currency: { type: "string", example: "NGN" },
            status: { type: "string", enum: ["pending", "success", "failed"] },
            paymentMethod: { type: "string", enum: ["card", "bank_transfer", "wallet"] },
            description: { type: "string", nullable: true },
            reference: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        GetWalletTransactionsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    transactions: { type: "array", items: { $ref: "#/components/schemas/WalletTransaction" } },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "number" },
                        page: { type: "number" },
                        limit: { type: "number" },
                        totalPages: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        Plan: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", enum: ["free", "bronze", "silver", "gold"] },
            displayName: { type: "string", example: "Bronze" },
            description: { type: "string" },
            price: { type: "number", description: "In kobo (₦1 = 100 kobo).", example: 500000 },
            priceInNaira: { type: "number", example: 5000 },
            maxProductListings: { type: "number", nullable: true, description: "null means unlimited." },
            payoutFrequency: { type: "string" },
            supportTier: { type: "string" },
            hasPrescriptionMatching: { type: "boolean" },
            hasHigherProductVisibility: { type: "boolean" },
            performanceSummaryLevel: { type: "string" },
            hasEarlyAccess: { type: "boolean" },
            isPopular: { type: "boolean" },
            features: { type: "array", items: { type: "string" } },
          },
        },
        PlansResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Plan" } } } },
          ],
        },
        SubscriptionDetail: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            plan: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
                displayName: { type: "string" },
                price: { type: "number" },
                priceInNaira: { type: "number" },
                maxProductListings: { type: "number", nullable: true },
                features: { type: "array", items: { type: "string" } },
              },
            },
            status: { type: "string", enum: ["active", "cancelled", "past_due"] },
            currentPeriodStart: { type: "string", format: "date-time", nullable: true },
            currentPeriodEnd: { type: "string", format: "date-time", nullable: true },
            autoRenew: { type: "boolean" },
            cancelledAt: { type: "string", format: "date-time", nullable: true },
            scheduledChange: {
              type: "object",
              nullable: true,
              description: "Non-null only when a downgrade (or cancel, which schedules a downgrade to Free) is pending.",
              properties: {
                id: { type: "string", format: "uuid" },
                toPlan: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    displayName: { type: "string" },
                    price: { type: "number" },
                    priceInNaira: { type: "number" },
                  },
                },
                scheduledDate: { type: "string", format: "date-time" },
                status: { type: "string", enum: ["pending", "applied", "cancelled"] },
              },
            },
          },
        },
        GetSubscriptionResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { $ref: "#/components/schemas/SubscriptionDetail" } } },
          ],
        },
        SubscriptionPaymentInitiation: {
          type: "object",
          description: "Returned when paymentMethod is card or bank_transfer — redirect the merchant to authorizationUrl, then call POST /subscriptions/confirm-payment with reference.",
          properties: {
            authorizationUrl: { type: "string", format: "uri" },
            redirectUrl: { type: "string", format: "uri" },
            returnUrl: { type: "string", format: "uri", nullable: true },
            accessCode: { type: "string" },
            reference: { type: "string" },
            amount: { type: "number", description: "In kobo." },
            amountInNaira: { type: "number" },
            planName: { type: "string", description: "Present on subscribe. Upgrade returns currentPlan/newPlan instead." },
            currentPlan: { type: "string" },
            newPlan: { type: "string" },
          },
        },
        SubscriptionWalletPaymentResult: {
          type: "object",
          description: "Returned instead of SubscriptionPaymentInitiation when paymentMethod is wallet — payment resolves immediately, no confirm step needed.",
          properties: {
            message: { type: "string" },
            subscription: {
              type: "object",
              properties: {
                plan: { type: "string" },
                status: { type: "string" },
                currentPeriodStart: { type: "string", format: "date-time" },
                currentPeriodEnd: { type: "string", format: "date-time" },
              },
            },
            walletBalance: { type: "number", description: "In kobo." },
            walletBalanceInNaira: { type: "number" },
          },
        },
        SubscribeResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  oneOf: [
                    { $ref: "#/components/schemas/SubscriptionPaymentInitiation" },
                    { $ref: "#/components/schemas/SubscriptionWalletPaymentResult" },
                  ],
                },
              },
            },
          ],
        },
        UpgradePlanResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "If the merchant is currently on the Free plan, this internally follows the same path as subscribe, so the response shape matches SubscribeResponse's data in that case too.",
              properties: {
                data: {
                  oneOf: [
                    { $ref: "#/components/schemas/SubscriptionPaymentInitiation" },
                    { $ref: "#/components/schemas/SubscriptionWalletPaymentResult" },
                  ],
                },
              },
            },
          ],
        },
        ConfirmSubscriptionPaymentResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    plan: { type: "string" },
                    status: { type: "string" },
                    currentPeriodStart: { type: "string", format: "date-time" },
                    currentPeriodEnd: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          ],
        },
        DowngradePlanResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "Deferred — the current plan stays active until scheduledDate, at which point the plan actually changes.",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    scheduledDate: { type: "string", format: "date-time" },
                    currentPlan: { type: "string" },
                    newPlan: { type: "string" },
                  },
                },
              },
            },
          ],
        },
        ToggleAutoRenewResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { type: "object", properties: { autoRenew: { type: "boolean" } } } } },
          ],
        },
        ContactSupportResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { type: "object", properties: { success: { type: "boolean", example: true } } } } },
          ],
        },
        Discount: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            merchantId: { type: "string", format: "uuid" },
            code: { type: "string", example: "WELCOME10" },
            type: { type: "string", enum: ["fixed_amount", "percentage"] },
            amount: { type: "number", example: 10 },
            applyToAllProducts: { type: "boolean" },
            applicableProducts: { type: "array", items: { type: "string", format: "uuid" }, nullable: true },
            applicableCategories: { type: "array", items: { type: "string" }, nullable: true },
            minOrderAmount: { type: "number", nullable: true },
            status: { type: "string", enum: ["active", "inactive"] },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
            usageLimit: { type: "number", nullable: true, description: "null means unlimited." },
            usageCount: { type: "number" },
            perUserLimit: { type: "number", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        DiscountResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { $ref: "#/components/schemas/Discount" } } },
          ],
        },
        DiscountListResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    discounts: { type: "array", items: { $ref: "#/components/schemas/Discount" } },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "number" },
                        page: { type: "number" },
                        limit: { type: "number" },
                        totalPages: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        DiscountStatsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    totalDiscounts: { type: "number" },
                    activeDiscounts: { type: "number" },
                    expiredDiscounts: { type: "number" },
                    totalUsageCount: { type: "number" },
                  },
                },
              },
            },
          ],
        },
        ValidateDiscountCodeResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    valid: { type: "boolean", example: true },
                    discountId: { type: "string", format: "uuid" },
                    code: { type: "string" },
                    type: { type: "string", enum: ["fixed_amount", "percentage"] },
                    amount: { type: "number" },
                    discountAmount: { type: "number", description: "The actual amount to subtract from orderAmount, already capped at orderAmount." },
                    message: { type: "string", example: "Discount code is valid" },
                  },
                },
              },
            },
          ],
        },
        Category: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            merchantId: { type: "string", format: "uuid" },
            name: { type: "string", example: "Antibiotics" },
            description: { type: "string", nullable: true },
            isDefault: { type: "boolean", description: "true for the two pre-seeded categories created at signup." },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        CategoryResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { $ref: "#/components/schemas/Category" } } },
          ],
        },
        CategoryListResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Category" } } } },
          ],
        },
        ProductImage: {
          type: "object",
          properties: {
            url: { type: "string", format: "uri" },
            order: { type: "number" },
            isMain: { type: "boolean" },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            merchantId: { type: "string", format: "uuid" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            category: { type: "string", example: "Antibiotics" },
            brand: { type: "string", example: "GSK" },
            sku: { type: "string", nullable: true },
            price: { type: "number", example: 1500.0 },
            vat: { type: "number", example: 112.5 },
            discountPercentage: { type: "number", example: 0 },
            minQuantity: { type: "number", example: 1 },
            maxQuantity: { type: "number", example: 100 },
            inventory: { type: "number" },
            purchaseCount: { type: "number", description: "Cumulative units sold across paid orders." },
            status: { type: "string", enum: ["in_stock", "low_stock", "out_of_stock"] },
            images: { type: "array", items: { $ref: "#/components/schemas/ProductImage" } },
            isActive: { type: "boolean" },
            requiresPrescription: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        ProductResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { $ref: "#/components/schemas/Product" } } },
          ],
        },
        ProductListResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    products: { type: "array", items: { $ref: "#/components/schemas/Product" } },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "number" },
                        page: { type: "number" },
                        limit: { type: "number" },
                        totalPages: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        LowStockProductsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Product" } } } },
          ],
        },
        ProductStatsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    totalProducts: { type: "number" },
                    activeProducts: { type: "number" },
                    lowStockCount: { type: "number" },
                    outOfStockCount: { type: "number" },
                    inStockCount: { type: "number" },
                  },
                },
              },
            },
          ],
        },
        SettingsProfile: {
          type: "object",
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string", format: "email" },
            phoneNumber: { type: "string" },
            phoneCountryCode: { type: "string", nullable: true, example: "+234" },
            profilePictureUrl: { type: "string", nullable: true },
          },
        },
        SettingsPayment: {
          type: "object",
          nullable: true,
          description: "null until payment details have been created (e.g. onboarding not completed).",
          properties: {
            bankName: { type: "string" },
            bankAccountNumber: { type: "string" },
            bankAccountName: { type: "string" },
            bankVerified: { type: "boolean" },
          },
        },
        SettingsStore: {
          type: "object",
          nullable: true,
          description: "null until store details exist.",
          properties: {
            businessName: { type: "string" },
            businessUrl: { type: "string", nullable: true },
            businessAddress: { type: "string", nullable: true },
            city: { type: "string", nullable: true },
            state: { type: "string", nullable: true },
            landmark: { type: "string", nullable: true },
            openHour: { type: "string", nullable: true },
            closeHour: { type: "string", nullable: true },
            vacation: { type: "boolean" },
            vacationStartDate: { type: "string", format: "date-time", nullable: true },
            vacationEndDate: { type: "string", format: "date-time", nullable: true },
            storeBannerUrl: { type: "string", nullable: true },
            storeDescription: { type: "string", nullable: true },
          },
        },
        NotificationChannelPreference: {
          type: "object",
          properties: {
            email: { type: "boolean" },
            sms: { type: "boolean" },
            desktop: { type: "boolean" },
          },
        },
        NotificationPreferences: {
          type: "object",
          properties: {
            orderPlaced: { $ref: "#/components/schemas/NotificationChannelPreference" },
            walletFunded: { $ref: "#/components/schemas/NotificationChannelPreference" },
            offlineSaleRecorded: { $ref: "#/components/schemas/NotificationChannelPreference" },
            lowStock: { $ref: "#/components/schemas/NotificationChannelPreference" },
            payoutAlert: { $ref: "#/components/schemas/NotificationChannelPreference" },
            supportTicket: { $ref: "#/components/schemas/NotificationChannelPreference" },
          },
        },
        SettingsNotifications: {
          type: "object",
          nullable: true,
          description: "null until a MerchantSettings row exists.",
          properties: {
            pushNotificationsEnabled: { type: "boolean" },
            emailNotificationsEnabled: { type: "boolean" },
            notificationPreferences: { $ref: "#/components/schemas/NotificationPreferences" },
          },
        },
        StorePreferences: {
          type: "object",
          properties: {
            acceptOrdersAutomatically: { type: "boolean" },
            requireManualApprovalForPrescriptions: { type: "boolean" },
            allowOutOfStockAlternatives: { type: "boolean" },
            autoHideOutOfStock: { type: "boolean" },
            enablePharmacyPickup: { type: "boolean" },
            enableInHouseDelivery: { type: "boolean" },
            deliveryRadius: { type: "number", nullable: true },
            deliveryFeeType: { type: "string", enum: ["flat", "distance-based"] },
            deliveryFlatFee: { type: "number", nullable: true },
            deliveryPricePerKm: { type: "number", nullable: true },
            deliveryStartTime: { type: "string", nullable: true },
            deliveryEndTime: { type: "string", nullable: true },
            lowStockThreshold: { type: "number", example: 5 },
            showLowStockLabel: { type: "boolean" },
          },
        },
        SettingsPreferences: {
          type: "object",
          nullable: true,
          description: "null until a MerchantSettings row exists.",
          properties: {
            storePreferences: { $ref: "#/components/schemas/StorePreferences" },
          },
        },
        GetAllSettingsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    profile: { $ref: "#/components/schemas/SettingsProfile" },
                    payment: { $ref: "#/components/schemas/SettingsPayment" },
                    store: { $ref: "#/components/schemas/SettingsStore" },
                    notifications: { $ref: "#/components/schemas/SettingsNotifications" },
                    preferences: { $ref: "#/components/schemas/SettingsPreferences" },
                  },
                },
              },
            },
          ],
        },
        UpdateProfileResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    phoneNumber: { type: "string" },
                    phoneCountryCode: { type: "string", nullable: true },
                  },
                },
              },
            },
          ],
        },
        UpdatePaymentResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "On a 400 name-mismatch response instead, data is { providedName, actualName, message }.",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    bankName: { type: "string" },
                    bankAccountNumber: { type: "string" },
                    bankAccountName: { type: "string" },
                    bankVerified: { type: "boolean", example: true },
                    verifiedAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          ],
        },
        UpdateStoreResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    businessName: { type: "string" },
                    businessUrl: { type: "string", nullable: true },
                    businessAddress: { type: "string", nullable: true },
                    city: { type: "string", nullable: true },
                    state: { type: "string", nullable: true },
                    landmark: { type: "string", nullable: true },
                    openHour: { type: "string", nullable: true },
                    closeHour: { type: "string", nullable: true },
                    vacation: { type: "boolean" },
                    vacationStartDate: { type: "string", format: "date-time", nullable: true },
                    vacationEndDate: { type: "string", format: "date-time", nullable: true },
                    storeDescription: { type: "string", nullable: true },
                    storeBannerUrl: { type: "string", nullable: true },
                  },
                },
              },
            },
          ],
        },
        UpdateNotificationsResponse: {
          type: "object",
          description: "This notification-settings endpoint returns statusCode (rather than the status envelope used by the device and push-test endpoints).",
          required: ["statusCode", "message", "data"],
          properties: {
            statusCode: { type: "integer", example: 200 },
            message: { type: "string", example: "Notification settings updated successfully" },
            data: {
              type: "object",
              properties: {
                pushNotificationsEnabled: { type: "boolean" },
                emailNotificationsEnabled: { type: "boolean" },
                notificationPreferences: { $ref: "#/components/schemas/NotificationPreferences" },
              },
            },
          },
        },
        MerchantNotificationDevice: {
          type: "object",
          description: "Safe browser-device registration returned to the frontend. The FCM token and user agent are intentionally never returned.",
          required: ["id", "deviceId", "platform", "isActive", "lastSeenAt"],
          properties: {
            id: { type: "string", format: "uuid", example: "1c17dca0-645d-4fd9-b0bc-0bc1f23c1a38" },
            deviceId: { type: "string", example: "a5ce5631-351c-4a86-9b58-c5523f738d61" },
            platform: { type: "string", enum: ["web"], example: "web" },
            browser: { type: "string", nullable: true, example: "Chrome" },
            isActive: { type: "boolean", example: true },
            lastSeenAt: { type: "string", format: "date-time", example: "2026-08-30T13:55:00.000Z" },
          },
        },
        RegisterMerchantDeviceTokenResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: { $ref: "#/components/schemas/MerchantNotificationDevice" },
              },
            },
          ],
        },
        RemoveMerchantDeviceTokenResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "This delete is idempotent: a 200 response with deactivated false means the device was already inactive or did not exist for this merchant.",
              properties: {
                data: {
                  type: "object",
                  required: ["deactivated"],
                  properties: {
                    deactivated: { type: "boolean", example: true },
                  },
                },
              },
            },
          ],
        },
        FirebasePushProviderStatus: {
          type: "object",
          description: "Safe backend Firebase Admin status. It does not expose credentials or registration tokens.",
          required: ["provider", "configured", "initializationError"],
          properties: {
            provider: { type: "string", enum: ["firebase"], example: "firebase" },
            configured: { type: "boolean", description: "True only when Firebase Admin initialized successfully in this backend process.", example: true },
            initializationError: { type: "string", nullable: true, description: "Null when Firebase Admin initialized successfully; otherwise a safe diagnostic message for the backend team.", example: null },
          },
        },
        MerchantPushStatusResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  required: ["provider", "firebase", "pushNotificationsEnabled", "activeDeviceCount"],
                  properties: {
                    provider: { type: "string", enum: ["firebase"], example: "firebase" },
                    firebase: { $ref: "#/components/schemas/FirebasePushProviderStatus" },
                    pushNotificationsEnabled: { type: "boolean", description: "Merchant's global push master switch.", example: true },
                    activeDeviceCount: { type: "integer", minimum: 0, description: "Number of active registered browser profiles for the authenticated merchant.", example: 1 },
                  },
                },
              },
            },
          ],
        },
        MerchantPushDeliveryResult: {
          type: "object",
          description: "Best-effort FCM delivery summary. A business operation remains successful even when push delivery fails.",
          required: ["provider", "event", "attempted", "sent", "failed", "invalidTokens"],
          properties: {
            provider: { type: "string", enum: ["firebase"], example: "firebase" },
            event: { type: "string", enum: ["orderPlaced", "walletFunded", "offlineSaleRecorded", "test"], example: "test" },
            attempted: { type: "integer", minimum: 0, example: 1 },
            sent: { type: "integer", minimum: 0, example: 1 },
            failed: { type: "integer", minimum: 0, example: 0 },
            invalidTokens: { type: "integer", minimum: 0, description: "Invalid FCM tokens deactivated by this attempt.", example: 0 },
            skipped: {
              type: "string",
              nullable: true,
              enum: ["push_disabled", "event_disabled", "no_active_devices", "firebase_not_configured"],
              description: "Present only when no FCM send is attempted for this reason.",
              example: null,
            },
          },
        },
        MerchantPushTestResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: { $ref: "#/components/schemas/MerchantPushDeliveryResult" },
              },
            },
          ],
        },
        UpdatePreferencesResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    storePreferences: { $ref: "#/components/schemas/StorePreferences" },
                  },
                },
              },
            },
          ],
        },
        UpdateAllSettingsResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "On HTTP 207 (partial success, when some sub-updates fail), data additionally includes an errors: string[] array alongside results.",
              properties: {
                data: {
                  type: "object",
                  description: "Only the slices that were actually submitted in the request are non-null; the rest stay null.",
                  properties: {
                    profile: { allOf: [{ $ref: "#/components/schemas/SettingsProfile" }], nullable: true },
                    payment: { $ref: "#/components/schemas/SettingsPayment" },
                    store: { $ref: "#/components/schemas/SettingsStore" },
                    notifications: { $ref: "#/components/schemas/SettingsNotifications" },
                    preferences: { $ref: "#/components/schemas/SettingsPreferences" },
                    errors: { type: "array", items: { type: "string" }, description: "Present only on the HTTP 207 partial-success case." },
                  },
                },
              },
            },
          ],
        },
        OnboardingStepStatus: {
          type: "object",
          properties: {
            completed: { type: "boolean" },
            required: { type: "boolean", example: true },
            url: { type: "string", nullable: true },
            verified: { type: "boolean", description: "Only present on the bank step." },
          },
        },
        OnboardingStatusResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    completed: { type: "boolean" },
                    currentStep: { type: "number", example: 1 },
                    steps: {
                      type: "object",
                      properties: {
                        validId: { $ref: "#/components/schemas/OnboardingStepStatus" },
                        profile: { $ref: "#/components/schemas/OnboardingStepStatus" },
                        bank: { $ref: "#/components/schemas/OnboardingStepStatus" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        UploadValidIdResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    validIdUrl: { type: "string", format: "uri" },
                    currentStep: { type: "number", example: 2 },
                    nextStep: { type: "string", example: "Upload Profile Picture" },
                  },
                },
              },
            },
          ],
        },
        UploadProfilePictureResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    profilePictureUrl: { type: "string", format: "uri" },
                    currentStep: { type: "number", example: 3 },
                    nextStep: { type: "string", example: "Verify Bank Account" },
                  },
                },
              },
            },
          ],
        },
        VerifyBankResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              description: "On a 400 name-mismatch response instead, data is { providedName, actualName, hint } so the client can retry with the actualName value.",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    verified: { type: "boolean", example: true },
                    accountName: { type: "string", example: "John Doe" },
                    bankName: { type: "string", example: "Guaranty Trust Bank" },
                    onboardingCompleted: { type: "boolean", example: true },
                  },
                },
              },
            },
          ],
        },
        Bank: {
          type: "object",
          properties: {
            name: { type: "string", example: "Guaranty Trust Bank" },
            code: { type: "string", example: "058" },
            slug: { type: "string", example: "guaranty-trust-bank" },
          },
        },
        BankListResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Bank" } } } },
          ],
        },
        ServiceStatus: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["up", "down"], example: "up" },
            error: { type: "string", description: "Present only when status is down.", nullable: true },
          },
        },
        HealthResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    app: { $ref: "#/components/schemas/ServiceStatus" },
                    db: { $ref: "#/components/schemas/ServiceStatus" },
                  },
                },
              },
            },
          ],
        },
        UploadFileResult: {
          type: "object",
          properties: {
            url: { type: "string", format: "uri", example: "https://bucket.s3.region.amazonaws.com/general/171234-ab12cd-file.pdf" },
            key: { type: "string", example: "general/171234-ab12cd-file.pdf" },
            filename: { type: "string", example: "file.pdf" },
            size: { type: "number", example: 20480 },
            mimetype: { type: "string", example: "application/pdf" },
          },
        },
        UploadSingleResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            { type: "object", properties: { data: { $ref: "#/components/schemas/UploadFileResult" } } },
          ],
        },
        UploadBulkResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    files: { type: "array", items: { $ref: "#/components/schemas/UploadFileResult" } },
                    totalSize: { type: "number", example: 40960 },
                  },
                },
              },
            },
          ],
        },
        RefreshTokenResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  properties: {
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    merchant: { $ref: "#/components/schemas/Merchant" },
                  },
                },
              },
            },
          ],
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "Merchant authentication endpoints",
      },
      {
        name: "Onboarding",
        description: "Post-login onboarding process",
      },
      {
        name: "Upload",
        description: "File upload endpoints",
      },
      {
        name: "Products",
        description: "Product inventory management endpoints",
      },
      {
        name: "Categories",
        description: "Merchant product category endpoints",
      },
      {
        name: "Internal Drugstore",
        description: "Signed service-to-service drugstore endpoints",
      },
      {
        name: "In-Store Sales",
        description: "Point-of-sale sale, cancellation, return, and manual refund endpoints",
      },
      {
        name: "Discounts",
        description: "Discount code management endpoints",
      },
      {
        name: "Merchant Settings",
        description: "Merchant settings and preferences endpoints",
      },
      {
        name: "Support",
        description: "Merchant support endpoints",
      },
      {
        name: "Subscriptions",
        description: "Merchant subscription and billing endpoints",
      },
      {
        name: "Wallet",
        description: "Merchant wallet and transaction endpoints",
      },
      {
        name: "Dashboard & Analytics",
        description: "Merchant dashboard and drugstore analytics endpoints",
      },
      {
        name: "Drugstore Orders",
        description: "Merchant drugstore order operations",
      },
      {
        name: "Drugstore Prescriptions",
        description: "Merchant prescription review endpoints",
      },
      {
        name: "Health",
        description: "Health check endpoints",
      },
    ],
  },
  apis: [
    path.join(srcPath, "modules/**/*.route.ts"),
    path.join(srcPath, "modules/**/*.controller.ts"),
    path.join(srcPath, "modules/**/controllers/*.ts"),
    path.join(srcPath, "modules/merchant_auth/controllers/*.ts"),
    path.join(srcPath, "modules/health/*.controller.ts"),
  ],
};

// Generate the spec
const swaggerSpec = swaggerJsdoc(options) as any;


export { swaggerSpec };
