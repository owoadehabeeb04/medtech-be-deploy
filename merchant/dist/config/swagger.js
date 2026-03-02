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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const path = __importStar(require("path"));
const config_1 = require("../config");
// Use process.cwd() to get the project root (where package.json is)
// This works better with ts-node and different execution contexts
const projectRoot = process.cwd();
const srcPath = path.join(projectRoot, "src");
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Merchant Backend API",
            version: "1.0.0",
            description: "API documentation for Merchant Backend Service",
            contact: {
                name: "QuickMedic Support",
                email: config_1.applicationConfig.supportEmail,
            },
        },
        servers: [
            {
                url: config_1.applicationConfig.baseUrl,
                description: "Development server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
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
                            type: "null",
                        },
                    },
                },
                Merchant: {
                    type: "object",
                    properties: {
                        id: {
                            type: "number",
                            example: 1,
                        },
                        email: {
                            type: "string",
                            example: "merchant@example.com",
                        },
                        name: {
                            type: "string",
                            example: "John Doe",
                        },
                        businessName: {
                            type: "string",
                            example: "ABC Pharmacy",
                        },
                        phoneNumber: {
                            type: "string",
                            example: "+2348012345678",
                        },
                        isVerified: {
                            type: "boolean",
                            example: true,
                        },
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
                name: "Discounts",
                description: "Discount code management endpoints",
            },
            {
                name: "Merchant Settings",
                description: "Merchant settings and preferences endpoints",
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
exports.swaggerSpec = swaggerSpec;
// Log for debugging
if (config_1.applicationConfig.nodeEnv === "development") {
    const pathCount = swaggerSpec.paths ? Object.keys(swaggerSpec.paths).length : 0;
    console.log("Swagger spec generated with", pathCount, "paths");
}
