import swaggerJsdoc from "swagger-jsdoc";
import * as path from "path";
import { applicationConfig } from "../config";

const srcPath = path.join(process.cwd(), "src");

const options: swaggerJsdoc.Options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "Experience 1 API",
			version: "1.0.0",
			description:
				"API documentation for the Experience 1 backend service — consumer and doctor auth, onboarding, appointments, and the drugstore (pharmacy ordering) flow.",
			contact: {
				name: "QuickMedic Support",
				email: "support@quickmedic.com",
			},
		},
		servers: [
			{
				url: applicationConfig.url.baseApi,
				description: "Experience 1 server",
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
					description: "Access token issued by /auth/login, /auth/signup/complete, /auth/signup/register, or /auth/refresh-token.",
				},
				internalAuth: {
					type: "apiKey",
					in: "header",
					name: "x-internal-signature",
					description:
						"HMAC-SHA256 request signing used only by the merchant service calling into experience_1's drugstore-internal routes. Requires x-internal-key-id, x-internal-timestamp, x-internal-nonce and x-internal-signature headers; not usable from a browser/Swagger UI 'Authorize' dialog.",
				},
			},
			schemas: {
				// ---------------------------------------------------------------
				// Shared envelope / error schemas
				// ---------------------------------------------------------------
				ErrorResponse: {
					type: "object",
					description:
						"Shared shape for every non-2xx response in this service (validation failures, auth/role/permission failures, business-rule failures, unexpected errors).",
					properties: {
						message: { type: "string", example: "Validation failed: \"email\" is required" },
						errorCode: { type: "string", example: "USR_301A", description: "Internal error code for support/log correlation." },
						statusCode: { type: "number", example: 400 },
						errors: {
							type: "object",
							additionalProperties: { type: "string" },
							description: "Present only for Joi validation failures (400). Keyed by field path, value is the human-readable reason. Omitted outside of validation errors and hidden in production for non-validation errors.",
							example: { email: "\"email\" is required" },
						},
					},
				},
				NotFoundResponse: {
					type: "object",
					description: "Returned when a controller produces no message and no data (see core/responseContext.ts) — distinct from the richer ErrorResponse shape.",
					properties: {
						message: { type: "string", example: "Not found." },
					},
				},

				// ---------------------------------------------------------------
				// user_auth
				// ---------------------------------------------------------------
				RegisterRequest: {
					type: "object",
					required: ["firstName", "lastName", "email", "phoneNumber", "password", "confirmPassword", "role"],
					properties: {
						firstName: { type: "string", minLength: 2, maxLength: 40, example: "Ada" },
						lastName: { type: "string", minLength: 2, maxLength: 40, example: "Obi" },
						email: { type: "string", format: "email", example: "ada.obi@example.com" },
						phoneNumber: { type: "string", minLength: 7, maxLength: 20, example: "+2348012345678" },
						password: {
							type: "string",
							minLength: 8,
							maxLength: 100,
							description: "Must include at least one uppercase letter, one lowercase letter, one number, and one special character.",
							example: "StrongPass1!",
						},
						confirmPassword: { type: "string", description: "Must exactly match password.", example: "StrongPass1!" },
						role: {
							type: "string",
							enum: ["customer", "medic", "consumer", "doctor"],
							description: "Account type being registered. customer/consumer both create a consumer account; medic/doctor both create a doctor account.",
							example: "doctor",
						},
						medicalLicenseNumber: {
							type: "string",
							minLength: 3,
							maxLength: 100,
							description: "Required only when role is medic/doctor.",
							example: "MDCN-12345",
						},
						verificationNumber: { type: "string", nullable: true, description: "Optional supplementary verification identifier." },
					},
				},
				SignupRequestOtpRequest: {
					type: "object",
					required: ["firstName", "lastName", "email", "role"],
					description: "Consumer-only. Doctors must use POST /auth/signup/register instead — this endpoint rejects role values other than customer/consumer.",
					properties: {
						firstName: { type: "string", minLength: 2, maxLength: 40, example: "Chidi" },
						lastName: { type: "string", minLength: 2, maxLength: 40, example: "Eze" },
						email: { type: "string", format: "email", example: "chidi.eze@example.com" },
						role: { type: "string", enum: ["customer", "consumer"], example: "consumer" },
					},
				},
				VerifyOtpRequest: {
					type: "object",
					required: ["sessionId", "otp"],
					properties: {
						sessionId: { type: "string", example: "3f1b1c9a-6e8b-4b7e-9b1a-1234567890ab" },
						otp: { type: "string", pattern: "^\\d{4,6}$", description: "4 to 6 digit numeric one-time code.", example: "482913" },
					},
				},
				ResendOtpRequest: {
					type: "object",
					required: ["sessionId"],
					properties: {
						sessionId: { type: "string", example: "3f1b1c9a-6e8b-4b7e-9b1a-1234567890ab" },
					},
				},
				CompleteSignupRequest: {
					type: "object",
					required: ["sessionId", "firstName", "lastName", "email", "phoneNumber", "password", "confirmPassword"],
					description: "Final step of consumer signup, called after the OTP session has been verified.",
					properties: {
						sessionId: { type: "string", example: "3f1b1c9a-6e8b-4b7e-9b1a-1234567890ab" },
						firstName: { type: "string", minLength: 2, maxLength: 40, example: "Ada" },
						lastName: { type: "string", minLength: 2, maxLength: 40, example: "Obi" },
						email: { type: "string", format: "email", description: "Must match the email address the OTP session verified.", example: "ada.obi@example.com" },
						phoneNumber: { type: "string", minLength: 7, maxLength: 20, example: "08012345678" },
						password: { type: "string", minLength: 8, maxLength: 100, example: "StrongPass1!" },
						confirmPassword: { type: "string", description: "Must exactly match password.", example: "StrongPass1!" },
					},
				},
				LoginRequest: {
					type: "object",
					required: ["email", "password", "role"],
					properties: {
						email: { type: "string", format: "email", example: "ada.obi@example.com" },
						password: { type: "string", minLength: 8, maxLength: 100, example: "StrongPass1!" },
						role: {
							type: "string",
							enum: ["customer", "medic", "consumer", "doctor"],
							description: "Must match the account's stored role (after customer→consumer / medic→doctor normalization) or login fails.",
							example: "consumer",
						},
					},
				},
				RefreshTokenRequest: {
					type: "object",
					required: ["refreshToken"],
					properties: {
						refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
					},
				},
				ForgotPasswordRequestOtpRequest: {
					type: "object",
					required: ["email"],
					description: "Always responds 200 whether or not the email exists, so account existence cannot be enumerated.",
					properties: {
						email: { type: "string", format: "email", example: "ada.obi@example.com" },
					},
				},
				ResetPasswordRequest: {
					type: "object",
					required: ["sessionId", "newPassword", "confirmPassword"],
					description: "Requires a sessionId whose OTP has already been verified via POST /auth/forgot-password/verify-otp.",
					properties: {
						sessionId: { type: "string", example: "3f1b1c9a-6e8b-4b7e-9b1a-1234567890ab" },
						newPassword: { type: "string", minLength: 8, maxLength: 100, example: "NewStrongPass1!" },
						confirmPassword: { type: "string", description: "Must exactly match newPassword.", example: "NewStrongPass1!" },
					},
				},
				LogoutRequest: {
					type: "object",
					description: "Body is optional. If refreshToken is omitted, only the current access token's session is revoked.",
					properties: {
						refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
					},
				},
				ChangePasswordRequest: {
					type: "object",
					required: ["oldPassword", "newPassword", "confirmNewPassword"],
					description: "Doctor-only endpoint (requires the doctor role).",
					properties: {
						oldPassword: { type: "string", minLength: 8, maxLength: 100, example: "StrongPass1!" },
						newPassword: { type: "string", minLength: 8, maxLength: 100, description: "Must differ from oldPassword.", example: "EvenStrongerPass2!" },
						confirmNewPassword: { type: "string", description: "Must exactly match newPassword.", example: "EvenStrongerPass2!" },
					},
				},
				OtpSessionResponse: {
					type: "object",
					properties: {
						sessionId: { type: "string", example: "3f1b1c9a-6e8b-4b7e-9b1a-1234567890ab" },
						otp: { type: "string", nullable: true, description: "Only present outside of production, as a local-dev convenience fallback when email delivery is skipped.", example: "482913" },
					},
				},
				OtpVerifiedResponse: {
					type: "object",
					properties: {
						sessionId: { type: "string", example: "3f1b1c9a-6e8b-4b7e-9b1a-1234567890ab" },
						purpose: { type: "string", enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET"], example: "EMAIL_VERIFICATION" },
					},
				},
				AuthUser: {
					type: "object",
					properties: {
						id: { type: "number", example: 42 },
						email: { type: "string", example: "ada.obi@example.com" },
						role: { type: "string", enum: ["consumer", "doctor"], example: "consumer" },
						firstName: { type: "string", example: "Ada" },
						lastName: { type: "string", example: "Obi" },
					},
				},
				ProfileStatus: {
					type: "object",
					properties: {
						onboardingCompleted: { type: "boolean", example: false },
						profileCompleted: { type: "boolean", example: false },
						nextStep: { type: "string", nullable: true, example: "consumer_phone" },
					},
				},
				AuthResponse: {
					type: "object",
					description: "Returned by every endpoint that issues or refreshes a session (register, complete-signup, login, refresh-token, change-password).",
					properties: {
						accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
						refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
						user: { $ref: "#/components/schemas/AuthUser" },
						profileStatus: { $ref: "#/components/schemas/ProfileStatus" },
						profileSummary: {
							type: "object",
							properties: {
								profile: { type: "object", nullable: true, description: "Consumer or doctor profile summary depending on role, or null if none exists yet." },
							},
						},
					},
				},
				UserMeResponse: {
					type: "object",
					properties: {
						user: { $ref: "#/components/schemas/AuthUser" },
						profileStatus: { $ref: "#/components/schemas/ProfileStatus" },
						profileSummary: {
							type: "object",
							properties: { profile: { type: "object", nullable: true } },
						},
					},
				},

				// ---------------------------------------------------------------
				// permission
				// ---------------------------------------------------------------
				PermissionRequest: {
					type: "object",
					required: ["key", "name", "description", "module"],
					description: "All string fields are stripped of non-alphanumeric characters (spaces, punctuation) before validation, so free-text values will lose spacing.",
					properties: {
						key: { type: "string", example: "createproduct" },
						name: { type: "string", example: "Create Product" },
						description: { type: "string", example: "Allows creating new products" },
						module: { type: "string", example: "products" },
					},
				},
				PermissionResponse: {
					type: "object",
					properties: {
						id: { type: "number", example: 1 },
						key: { type: "string", example: "createproduct" },
						name: { type: "string", example: "Create Product" },
						module: { type: "string", example: "products" },
						description: { type: "string", example: "allows creating new products" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				BulkPermissionRequest: {
					type: "object",
					required: ["permissions"],
					properties: {
						permissions: {
							type: "array",
							minItems: 1,
							items: {
								type: "object",
								required: ["key", "name", "module", "description"],
								properties: {
									key: { type: "string" },
									name: { type: "string" },
									module: { type: "string" },
									description: { type: "string" },
								},
							},
						},
					},
				},
				BulkPermissionResponse: {
					type: "object",
					properties: {
						created: { type: "array", items: { $ref: "#/components/schemas/PermissionResponse" } },
						skipped: {
							type: "array",
							description: "Entries whose key already existed and were therefore not created.",
							items: {
								type: "object",
								properties: { key: { type: "string" }, name: { type: "string" }, module: { type: "string" }, description: { type: "string" } },
							},
						},
						totalReceived: { type: "number", example: 5 },
						totalCreated: { type: "number", example: 3 },
						totalSkipped: { type: "number", example: 2 },
					},
				},
				AssignPermissionRequest: {
					type: "object",
					required: ["userTypeId", "permissionIds"],
					description: "Replaces the user type's entire permission set with the given list.",
					properties: {
						userTypeId: { type: "number", example: 2 },
						permissionIds: { type: "array", minItems: 1, items: { type: "number" }, example: [1, 2, 3] },
					},
				},
				BulkAssignPermissionRequest: {
					type: "object",
					required: ["assignments"],
					description: "Runs inside a single database transaction — either every assignment succeeds or none do.",
					properties: {
						assignments: {
							type: "array",
							minItems: 1,
							items: {
								type: "object",
								required: ["userTypeId", "permissionIds"],
								properties: {
									userTypeId: { type: "number" },
									permissionIds: { type: "array", minItems: 1, items: { type: "number" } },
								},
							},
						},
					},
				},
				BulkAssignPermissionResponse: {
					type: "object",
					properties: {
						totalUserTypes: { type: "number", example: 2 },
						totalAssignments: { type: "number", example: 5 },
						summary: {
							type: "array",
							items: { type: "object", properties: { userTypeId: { type: "number" }, permissionsAssigned: { type: "number" } } },
						},
					},
				},
				RemovePermissionRequest: {
					type: "object",
					required: ["userTypeId", "permissionIds"],
					properties: {
						userTypeId: { type: "number", example: 2 },
						permissionIds: { type: "array", minItems: 1, items: { type: "number" }, example: [3] },
					},
				},
				UserTypePermissionsResponse: {
					type: "object",
					properties: {
						userType: { type: "object", properties: { id: { type: "number" }, name: { type: "string" }, key: { type: "string" } } },
						permissions: { type: "array", items: { $ref: "#/components/schemas/PermissionResponse" } },
					},
				},

				// ---------------------------------------------------------------
				// speciality
				// ---------------------------------------------------------------
				SpecialityRequest: {
					type: "object",
					required: ["name", "key"],
					description: "name is stripped of non-alphanumeric characters before validation; key is exempt from that stripping.",
					properties: {
						name: { type: "string", example: "Cardiology" },
						key: { type: "string", example: "cardiology" },
						isActive: { type: "boolean", default: true },
					},
				},
				SpecialityUpdateRequest: {
					type: "object",
					description: "All fields optional — only supplied fields are updated.",
					properties: {
						name: { type: "string", example: "Cardiology" },
						key: { type: "string", example: "cardiology" },
						isActive: { type: "boolean" },
					},
				},
				BulkSpecialityRequest: {
					type: "object",
					required: ["specialities"],
					properties: {
						specialities: { type: "array", items: { $ref: "#/components/schemas/SpecialityRequest" } },
					},
				},
				SpecialityResponse: {
					type: "object",
					properties: {
						id: { type: "number", example: 1 },
						name: { type: "string", example: "cardiology" },
						key: { type: "string", example: "cardiology" },
						isActive: { type: "boolean", example: true },
					},
				},

				// ---------------------------------------------------------------
				// user_types
				// ---------------------------------------------------------------
				UserTypeRequest: {
					type: "object",
					required: ["name", "key"],
					properties: {
						name: { type: "string", example: "Doctor" },
						key: { type: "string", example: "doctor" },
						permissionIds: { type: "array", items: { type: "number" }, description: "Permissions to attach to this user type on creation.", example: [1, 2] },
					},
				},
				UserTypeUpdateRequest: {
					type: "object",
					required: ["name", "key", "userTypeId"],
					description: "Full-replace semantics — name and key are required even for a partial-feeling update.",
					properties: {
						name: { type: "string", example: "Doctor" },
						key: { type: "string", example: "doctor" },
						isActive: { type: "boolean" },
						userTypeId: { type: "number", example: 2 },
					},
				},
				UserTypeResponse: {
					type: "object",
					properties: {
						id: { type: "number", example: 2 },
						name: { type: "string", example: "Doctor" },
						key: { type: "string", example: "doctor" },
						isActive: { type: "boolean", example: true },
						permissions: { type: "array", items: { $ref: "#/components/schemas/PermissionResponse" } },
					},
				},

				// ---------------------------------------------------------------
				// health
				// ---------------------------------------------------------------
				HealthResponse: {
					type: "object",
					properties: {
						app: { $ref: "#/components/schemas/HealthCheckEntry" },
						db: { $ref: "#/components/schemas/HealthCheckEntry" },
						redis: { $ref: "#/components/schemas/HealthCheckEntry" },
					},
				},
				HealthCheckEntry: {
					type: "object",
					properties: {
						status: { type: "string", enum: ["up", "down"], example: "up" },
						error: { type: "string", description: "Present only when status is down.", nullable: true },
					},
				},

				// ---------------------------------------------------------------
				// consumer_profile
				// ---------------------------------------------------------------
				ConsumerProfileRequest: {
					type: "object",
					description: "At least one field is required. Address pieces are merged server-side into a derived location string.",
					properties: {
						username: { type: "string", minLength: 3, maxLength: 50, example: "ada_obi" },
						phoneNumber: { type: "string", minLength: 7, maxLength: 20, example: "+2348012345678" },
						dateOfBirth: { type: "string", format: "date", example: "1995-06-12" },
						houseNumber: { type: "string", minLength: 1, maxLength: 50, example: "14B" },
						streetName: { type: "string", minLength: 2, maxLength: 120, example: "Adeola Odeku Street" },
						localGovernmentArea: { type: "string", minLength: 2, maxLength: 120, example: "Eti-Osa" },
						state: { type: "string", minLength: 2, maxLength: 120, example: "Lagos" },
						profileImage: { type: "string", format: "uri", example: "https://bucket.s3.amazonaws.com/consumer-profile/42/photo.jpg" },
					},
				},
				ConsumerProfileEntry: {
					type: "object",
					properties: {
						userId: { type: "number", example: 42 },
						username: { type: "string", nullable: true, example: "ada_obi" },
						phoneNumber: { type: "string", nullable: true, example: "+2348012345678" },
						dateOfBirth: { type: "string", format: "date", nullable: true },
						location: { type: "string", nullable: true, example: "14B Adeola Odeku Street, Eti-Osa, Lagos" },
						houseNumber: { type: "string", nullable: true },
						streetName: { type: "string", nullable: true },
						localGovernmentArea: { type: "string", nullable: true },
						state: { type: "string", nullable: true },
						profileImage: { type: "string", nullable: true },
						profileCompleted: { type: "boolean", example: false },
						onboardingSkipped: { type: "boolean", example: false },
						skippedSteps: { type: "array", items: { type: "string" }, example: [] },
					},
				},
				ConsumerProfileResponse: {
					type: "object",
					properties: {
						profile: { $ref: "#/components/schemas/ConsumerProfileEntry" },
						profileStatus: { $ref: "#/components/schemas/ProfileStatus" },
					},
				},
				ConsumerProfileImageUploadResponse: {
					type: "object",
					properties: {
						profile: { $ref: "#/components/schemas/ConsumerProfileEntry" },
						profileStatus: { $ref: "#/components/schemas/ProfileStatus" },
						upload: { type: "object", properties: { key: { type: "string" }, url: { type: "string" } } },
					},
				},

				// ---------------------------------------------------------------
				// doctor_profile
				// ---------------------------------------------------------------
				DoctorAccountRequest: {
					type: "object",
					description: "At least one field required. Email cannot be changed from this endpoint — omit it, it is rejected if present.",
					properties: {
						firstName: { type: "string", minLength: 2, maxLength: 40, example: "Chidi" },
						lastName: { type: "string", minLength: 2, maxLength: 40, example: "Eze" },
						phoneNumber: { type: "string", pattern: "^[0-9+()\\-\\s]{7,20}$", example: "+2348012345678" },
					},
				},
				DoctorBasicProfileRequest: {
					type: "object",
					description: "At least one field required.",
					properties: {
						firstName: { type: "string", minLength: 2, maxLength: 40 },
						lastName: { type: "string", minLength: 2, maxLength: 40 },
						phoneNumber: { type: "string", pattern: "^[0-9+()\\-\\s]{7,20}$", example: "+2348012345678" },
						medicalLicenseNumber: { type: "string", minLength: 3, maxLength: 100, example: "MDCN-12345" },
						yearsOfExperience: { type: "number", minimum: 0, example: 6 },
						bio: { type: "string", maxLength: 1000, nullable: true, example: "General practitioner with a focus on family medicine." },
					},
				},
				DoctorAddressRequest: {
					type: "object",
					required: ["addressLine1", "city", "state"],
					properties: {
						addressLine1: { type: "string", minLength: 2, maxLength: 255, example: "14B Adeola Odeku Street" },
						addressLine2: { type: "string", maxLength: 255, nullable: true },
						city: { type: "string", minLength: 2, maxLength: 100, example: "Lagos" },
						state: { type: "string", minLength: 2, maxLength: 100, example: "Lagos" },
						country: { type: "string", maxLength: 100, nullable: true, example: "Nigeria" },
						postalCode: { type: "string", minLength: 3, maxLength: 20, pattern: "^[A-Za-z0-9 -]+$", nullable: true, example: "101233" },
					},
				},
				DoctorEducationRequest: {
					type: "object",
					required: ["certificate", "startDate"],
					description: "Exactly one of institution or institute must be supplied (they are treated as the same field). endDate, if given, cannot be before startDate.",
					properties: {
						institution: { type: "string", minLength: 2, maxLength: 255, example: "University of Lagos" },
						institute: { type: "string", minLength: 2, maxLength: 255, example: "University of Lagos" },
						certificate: { type: "string", minLength: 2, maxLength: 255, example: "MBBS" },
						startDate: { type: "string", format: "date", example: "2010-09-01" },
						endDate: { type: "string", format: "date", nullable: true, example: "2016-07-01" },
					},
				},
				DoctorWorkHistoryRequest: {
					type: "object",
					required: ["designation", "startDate"],
					description: "Exactly one of companyOrInstitution or company must be supplied (they are treated as the same field). endDate, if given, cannot be before startDate.",
					properties: {
						companyOrInstitution: { type: "string", minLength: 2, maxLength: 255, example: "Lagos University Teaching Hospital" },
						company: { type: "string", minLength: 2, maxLength: 255, example: "Lagos University Teaching Hospital" },
						designation: { type: "string", minLength: 2, maxLength: 255, example: "Resident Doctor" },
						startDate: { type: "string", format: "date", example: "2017-01-01" },
						endDate: { type: "string", format: "date", nullable: true },
					},
				},
				DoctorSpecialtiesRequest: {
					type: "object",
					description: "Exactly one of specialityIds or specialtyIds must be supplied (they are treated as the same field). Replaces the doctor's entire specialty set.",
					properties: {
						specialityIds: { type: "array", items: { type: "number" }, minItems: 1, example: [1, 4] },
						specialtyIds: { type: "array", items: { type: "number" }, minItems: 1, example: [1, 4] },
						yearsOfExperience: { type: "number", minimum: 0, example: 6 },
						bio: { type: "string", maxLength: 1000, nullable: true },
					},
				},
				DoctorProfileAggregateResponse: {
					type: "object",
					description: "Shared response shape returned by every doctor_profile mutation endpoint (basic profile, image, address, education, work-history, specialties, complete-onboarding) — each endpoint only mutates one slice, but the full aggregate is always returned so the client can refresh its whole view.",
					properties: {
						profile: { type: "object", description: "The doctor profile row (basic info, license number, image, etc.)." },
						educationHistory: { type: "array", items: { type: "object", properties: { id: { type: "number" }, institution: { type: "string" }, certificate: { type: "string" }, startDate: { type: "string", format: "date" }, endDate: { type: "string", format: "date", nullable: true } } } },
						workHistory: { type: "array", items: { type: "object", properties: { id: { type: "number" }, companyOrInstitution: { type: "string" }, designation: { type: "string" }, startDate: { type: "string", format: "date" }, endDate: { type: "string", format: "date", nullable: true } } } },
						specialties: { type: "array", items: { type: "object", properties: { id: { type: "number" }, specialityId: { type: "number" }, isActive: { type: "boolean" } } } },
						profileStatus: { $ref: "#/components/schemas/ProfileStatus" },
					},
				},
				DoctorProfileMeResponse: {
					type: "object",
					description: "Richer account-info view returned only by GET /doctor/profile/me.",
					properties: {
						accountInformation: { type: "object", properties: { firstName: { type: "string" }, lastName: { type: "string" }, phoneNumber: { type: "string" }, email: { type: "string" }, profileImageUrl: { type: "string", nullable: true } } },
						contactAddress: { type: "object", properties: { addressLine1: { type: "string" }, addressLine2: { type: "string", nullable: true }, city: { type: "string" }, state: { type: "string" }, country: { type: "string", nullable: true }, postalCode: { type: "string", nullable: true } } },
						educationHistory: { type: "array", items: { type: "object", properties: { id: { type: "number" }, institution: { type: "string" }, certificate: { type: "string" }, startDate: { type: "string", format: "date" }, endDate: { type: "string", format: "date", nullable: true } } } },
						workHistory: { type: "array", items: { type: "object", properties: { id: { type: "number" }, companyOrInstitution: { type: "string" }, designation: { type: "string" }, startDate: { type: "string", format: "date" }, endDate: { type: "string", format: "date", nullable: true } } } },
						specialtyInformation: { type: "object", properties: { specialtyIds: { type: "array", items: { type: "number" } }, specialtyNames: { type: "array", items: { type: "string" } }, specialties: { type: "array", items: { type: "object", properties: { id: { type: "number" }, name: { type: "string" }, key: { type: "string" } } } }, yearsOfExperience: { type: "number", nullable: true }, bio: { type: "string", nullable: true } } },
						profileStatus: { $ref: "#/components/schemas/ProfileStatus" },
					},
				},

				// ---------------------------------------------------------------
				// doctor_settings
				// ---------------------------------------------------------------
				DoctorSettingsResponse: {
					type: "object",
					properties: {
						pushNotificationsEnabled: { type: "boolean", example: true },
						biometricLoginEnabled: { type: "boolean", example: false },
						autoLogoutOnAppClose: { type: "boolean", example: false },
						activeDeviceTokenCount: { type: "number", example: 1 },
					},
				},
				DoctorSettingsPreferencesRequest: {
					type: "object",
					description: "At least one field required.",
					properties: {
						pushNotificationsEnabled: { type: "boolean" },
						biometricLoginEnabled: { type: "boolean" },
						autoLogoutOnAppClose: { type: "boolean" },
					},
				},
				DeviceTokenRequest: {
					type: "object",
					required: ["deviceId", "deviceToken", "platform"],
					description: "Upserts by (doctorId, deviceId). Any other row sharing the same deviceToken is deactivated first, so a token can only be active on one device record.",
					properties: {
						deviceId: { type: "string", minLength: 1, maxLength: 255, example: "iphone-15-pro-abc123" },
						deviceToken: { type: "string", minLength: 1, maxLength: 2048, example: "fcm-token-xyz" },
						platform: { type: "string", enum: ["ios", "android"], example: "ios" },
					},
				},
				DeviceTokenResponse: {
					type: "object",
					properties: {
						deviceId: { type: "string", example: "iphone-15-pro-abc123" },
						platform: { type: "string", example: "ios" },
						isActive: { type: "boolean", example: true },
						lastSeenAt: { type: "string", format: "date-time" },
					},
				},

				// ---------------------------------------------------------------
				// doctor_rates
				// ---------------------------------------------------------------
				DoctorRatesResponse: {
					type: "object",
					properties: {
						consultationRate: {
							type: "object",
							nullable: true,
							properties: { id: { type: "number" }, amountKobo: { type: "number" }, amountNgn: { type: "number", example: 5000 }, durationMinutes: { type: "number", example: 30 }, isActive: { type: "boolean" }, updatedAt: { type: "string", format: "date-time" } },
						},
						subscriptionPlans: {
							type: "array",
							items: { type: "object", properties: { id: { type: "number" }, title: { type: "string" }, amountKobo: { type: "number" }, amountNgn: { type: "number" }, durationDays: { type: "number" }, sortOrder: { type: "number" }, isActive: { type: "boolean" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } },
						},
						healthPackagesPreviewCount: { type: "number", example: 2 },
					},
				},
				ConsultationRateRequest: {
					type: "object",
					required: ["amountNgn", "durationMinutes"],
					properties: {
						amountNgn: { type: "number", exclusiveMinimum: 0, example: 5000 },
						durationMinutes: { type: "number", minimum: 1, example: 30 },
					},
				},
				SubscriptionPlansRequest: {
					type: "object",
					required: ["plans"],
					description: "Replaces the doctor's entire active subscription-plan list — existing active plans are deactivated and the given list is created fresh.",
					properties: {
						plans: {
							type: "array",
							minItems: 1,
							items: {
								type: "object",
								required: ["title", "amountNgn", "durationDays"],
								properties: {
									title: { type: "string", minLength: 1, maxLength: 150, example: "Monthly Follow-up" },
									amountNgn: { type: "number", exclusiveMinimum: 0, example: 15000 },
									durationDays: { type: "number", minimum: 1, example: 30 },
									sortOrder: { type: "number", minimum: 0 },
								},
							},
						},
					},
				},

				// ---------------------------------------------------------------
				// doctor_reviews
				// ---------------------------------------------------------------
				DoctorReviewsListResponse: {
					type: "object",
					properties: {
						items: {
							type: "array",
							items: {
								type: "object",
								properties: {
									id: { type: "number" },
									rating: { type: "number", example: 5 },
									comment: { type: "string" },
									reviewerDisplayName: { type: "string" },
									reviewerAvatarUrl: { type: "string", nullable: true },
									createdAt: { type: "string", format: "date-time" },
									reply: { type: "object", nullable: true, properties: { id: { type: "number" }, message: { type: "string" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } },
								},
							},
						},
						pageInfo: { type: "object", properties: { hasNextPage: { type: "boolean" }, nextCursorCreatedAt: { type: "string", format: "date-time", nullable: true }, nextCursorId: { type: "number", nullable: true } } },
					},
				},
				DoctorReviewSummaryResponse: {
					type: "object",
					properties: {
						averageRating: { type: "number", example: 4.6 },
						totalReviews: { type: "number", example: 23 },
						ratingBreakdown: { type: "object", properties: { "1": { type: "number" }, "2": { type: "number" }, "3": { type: "number" }, "4": { type: "number" }, "5": { type: "number" } } },
					},
				},
				DoctorReplyRequest: {
					type: "object",
					required: ["message"],
					properties: { message: { type: "string", minLength: 1, maxLength: 400, example: "Thank you for the feedback!" } },
				},
				DoctorReplyResponse: {
					type: "object",
					properties: {
						reviewId: { type: "number" },
						reply: { type: "object", properties: { id: { type: "number" }, message: { type: "string" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } },
					},
				},
				ConsumerReviewRequest: {
					type: "object",
					required: ["rating", "comment"],
					description: "Can only be submitted for the caller's own completed appointment, and only once.",
					properties: {
						rating: { type: "number", minimum: 1, maximum: 5, example: 5 },
						comment: { type: "string", minLength: 1, maxLength: 1000, example: "Great consultation, very thorough." },
					},
				},
				ConsumerReviewResponse: {
					type: "object",
					properties: {
						review: {
							type: "object",
							properties: { id: { type: "number" }, appointmentId: { type: "number" }, doctorId: { type: "number" }, patientId: { type: "number" }, rating: { type: "number" }, comment: { type: "string" }, reviewerDisplayName: { type: "string" }, reviewerAvatarUrl: { type: "string", nullable: true }, createdAt: { type: "string", format: "date-time" }, reply: { type: "object", nullable: true } },
						},
						summary: { $ref: "#/components/schemas/DoctorReviewSummaryResponse" },
					},
				},

				// ---------------------------------------------------------------
				// doctor_health_packages
				// ---------------------------------------------------------------
				HealthPackageCreateRequest: {
					type: "object",
					required: ["title", "priceNgn", "description"],
					description: "multipart/form-data. coverImage (image/jpeg|jpg|png|webp, max 1 file) and attachment (pdf/doc/docx, max 1 file) are both optional file fields alongside these text fields.",
					properties: {
						title: { type: "string", minLength: 1, maxLength: 150, example: "Full Body Checkup" },
						priceNgn: { type: "number", exclusiveMinimum: 0, example: 25000 },
						description: { type: "string", minLength: 1, maxLength: 5000, example: "Comprehensive checkup including bloodwork and imaging." },
						coverImage: { type: "string", format: "binary" },
						attachment: { type: "string", format: "binary" },
					},
				},
				HealthPackageUpdateRequest: {
					type: "object",
					description: "multipart/form-data, all fields optional — at least one field or file must be supplied.",
					properties: {
						title: { type: "string", minLength: 1, maxLength: 150 },
						priceNgn: { type: "number", exclusiveMinimum: 0 },
						description: { type: "string", minLength: 1, maxLength: 5000 },
						coverImage: { type: "string", format: "binary" },
						attachment: { type: "string", format: "binary" },
					},
				},
				HealthPackageResponse: {
					type: "object",
					properties: {
						id: { type: "number" },
						title: { type: "string" },
						priceKobo: { type: "number" },
						priceNgn: { type: "number" },
						description: { type: "string" },
						coverImageUrl: { type: "string", nullable: true },
						attachmentUrl: { type: "string", nullable: true },
						soldCount: { type: "number" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				HealthPackageListResponse: {
					type: "object",
					properties: { packages: { type: "array", items: { $ref: "#/components/schemas/HealthPackageResponse" } } },
				},

				// ---------------------------------------------------------------
				// appointment
				// ---------------------------------------------------------------
				BookAppointmentRequest: {
					type: "object",
					required: ["age", "medicId", "scheduleDate", "consultationType", "appointmentType"],
					description: "When appointmentType is 'personal', patientName/gender are derived from the logged-in user if omitted.",
					properties: {
						patientName: { type: "string", example: "Ada Obi" },
						gender: { type: "string", example: "female" },
						age: { type: "number", example: 29 },
						medicId: { type: "number", description: "User ID of the doctor being booked.", example: 17 },
						scheduleDate: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" },
						consultationType: { type: "string", description: "Looked up (or auto-created outside production) by key.", example: "video" },
						appointmentType: { type: "string", example: "personal" },
					},
				},
				AppointmentResponse: {
					type: "object",
					properties: {
						id: { type: "number" },
						bookedByUserId: { type: "number" },
						patientName: { type: "string" },
						gender: { type: "string" },
						age: { type: "number" },
						medicId: { type: "number" },
						scheduleDate: { type: "string", format: "date-time" },
						consultationType: { type: "string" },
						appointmentType: { type: "string" },
						status: { type: "string", enum: ["pending", "confirmed", "cancelled", "checked-in", "in-progress", "completed", "no-show"] },
						extraInfo: { type: "string", nullable: true },
					},
				},
				AppointmentListResponse: {
					type: "object",
					description: "Standard pagination wrapper around AppointmentResponse rows.",
					properties: {
						data: { type: "array", items: { $ref: "#/components/schemas/AppointmentResponse" } },
						pagination: { type: "object", properties: { page: { type: "number" }, limit: { type: "number" }, total: { type: "number" }, totalPages: { type: "number" } } },
					},
				},

				// ---------------------------------------------------------------
				// drugstore
				// ---------------------------------------------------------------
				DrugstoreAddressRequest: {
					type: "object",
					required: ["addressLine1", "city", "state", "recipientName", "recipientPhone"],
					properties: {
						label: { type: "string", maxLength: 80, example: "Home" },
						addressLine1: { type: "string", minLength: 3, maxLength: 200, example: "14B Adeola Odeku Street" },
						addressLine2: { type: "string", maxLength: 200 },
						city: { type: "string", minLength: 2, maxLength: 80, example: "Lagos" },
						state: { type: "string", minLength: 2, maxLength: 80, example: "Lagos" },
						recipientName: { type: "string", minLength: 2, maxLength: 120, example: "Ada Obi" },
						recipientPhone: { type: "string", minLength: 7, maxLength: 20, example: "+2348012345678" },
						isDefault: { type: "boolean" },
						latitude: { type: "number", minimum: -90, maximum: 90, nullable: true },
						longitude: { type: "number", minimum: -180, maximum: 180, nullable: true },
					},
				},
				DrugstoreAddressResponse: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						userId: { type: "number" },
						label: { type: "string", nullable: true },
						addressLine1: { type: "string" },
						addressLine2: { type: "string", nullable: true },
						city: { type: "string" },
						state: { type: "string" },
						recipientName: { type: "string" },
						recipientPhone: { type: "string" },
						isDefault: { type: "boolean" },
						latitude: { type: "number", nullable: true },
						longitude: { type: "number", nullable: true },
					},
				},
				NearbyPharmaciesResponse: {
					type: "object",
					description: "Passthrough of the merchant service's response. Since a caller can hold one active cart per pharmacy simultaneously, each pharmacy carries its own independent cartCompatibility rather than a single global flag.",
					properties: {
						items: {
							type: "array",
							items: {
								type: "object",
								properties: {
									id: { type: "string", format: "uuid" },
									businessName: { type: "string" },
									isOpen: { type: "boolean" },
									deliveryFeePreview: { type: "number" },
									supportsDelivery: { type: "boolean" },
									supportsPickup: { type: "boolean" },
									cartCompatibility: {
										type: "object",
										nullable: true,
										description: "Non-null only when the caller has an active cart at this specific pharmacy.",
										properties: {
											supported: { type: "boolean", example: true },
											itemCount: { type: "number" },
											subtotal: { type: "number" },
										},
									},
								},
							},
						},
						pagination: { type: "object", properties: { page: { type: "number" }, limit: { type: "number" }, total: { type: "number" } } },
					},
				},
				PharmacyProfileResponse: {
					type: "object",
					description: "Passthrough of the merchant service's public store profile.",
					properties: { merchantId: { type: "string", format: "uuid" }, businessName: { type: "string" }, address: { type: "string" }, rating: { type: "number", nullable: true } },
				},
				PharmacyReviewsResponse: {
					type: "object",
					description: "Passthrough of the merchant service's reviews for the given pharmacy.",
					properties: { items: { type: "array", items: { type: "object" } }, pagination: { type: "object" } },
				},
				CatalogProductsResponse: {
					type: "object",
					description: "Passthrough of the merchant service's product catalog.",
					properties: { products: { type: "array", items: { type: "object" } }, pagination: { type: "object" } },
				},
				CatalogProductResponse: {
					type: "object",
					description: "Passthrough of a single merchant product.",
					properties: { id: { type: "string", format: "uuid" }, name: { type: "string" }, priceKobo: { type: "number" }, stock: { type: "number" } },
				},
				CatalogCategoriesResponse: {
					type: "object",
					description: "Passthrough of the merchant service's category list for the given merchant.",
					properties: { categories: { type: "array", items: { type: "object" } } },
				},
				ProductAvailabilityResponse: {
					type: "object",
					description: "Always returned with HTTP 200 when the product/merchant pair exists — check `available` to know whether it can be added to cart, not the status code.",
					properties: {
						available: { type: "boolean", example: false },
						reason: {
							type: "string",
							nullable: true,
							description: "null when available is true. Otherwise one of: \"Product is unavailable\", \"Quantity must be between {min} and {max}\", \"Requested quantity exceeds available stock\".",
							example: "Requested quantity exceeds available stock",
						},
						inventory: { type: "number", example: 0 },
						minQuantity: { type: "number", example: 1 },
						maxQuantity: { type: "number", example: 10 },
						requiresPrescription: { type: "boolean", example: false },
					},
				},
				DiscountValidateRequest: {
					type: "object",
					required: ["merchantId", "code", "orderAmount", "productIds"],
					properties: {
						merchantId: { type: "string", format: "uuid" },
						code: { type: "string", description: "Uppercased before validation.", example: "SAVE10" },
						orderAmount: { type: "number", minimum: 0, example: 5000 },
						productIds: { type: "array", minItems: 1, items: { type: "string", format: "uuid" } },
					},
				},
				DiscountValidateResponse: {
					type: "object",
					properties: {
						valid: { type: "boolean" },
						discountId: { type: "string", format: "uuid", nullable: true },
						code: { type: "string" },
						type: { type: "string", nullable: true },
						amount: { type: "number", nullable: true },
						discountAmount: { type: "number", nullable: true },
						message: { type: "string" },
					},
				},
				PrescriptionResponse: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						userId: { type: "number" },
						merchantId: { type: "string", format: "uuid", description: "Placeholder all-zero UUID until the prescription is submitted to a pharmacy." },
						fileUrl: { type: "string" },
						fileKey: { type: "string" },
						fileName: { type: "string" },
						fileMimeType: { type: "string" },
						fileSize: { type: "number" },
						status: { type: "string", enum: ["uploaded", "submitted", "approved", "rejected", "needs_clarification"] },
					},
				},
				SubmitPrescriptionRequest: {
					type: "object",
					required: ["merchantId", "patientName", "prescriptionDate"],
					properties: {
						merchantId: { type: "string", format: "uuid" },
						cartId: { type: "string", format: "uuid" },
						patientName: { type: "string", minLength: 2, maxLength: 120, example: "Ada Obi" },
						prescriptionDate: { type: "string", format: "date", example: "2026-07-01" },
						isForSelf: { type: "boolean", default: true },
					},
				},
				DrugstoreCartResponse: {
					type: "object",
					nullable: true,
					properties: {
						id: { type: "string", format: "uuid" },
						merchantId: { type: "string", format: "uuid" },
						items: { type: "array", items: { $ref: "#/components/schemas/DrugstoreCartItem" } },
						subtotal: { type: "number" },
						vatTotal: { type: "number" },
						discountTotal: { type: "number" },
						grandTotal: { type: "number" },
					},
				},
				DrugstoreCartItem: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						merchantProductId: { type: "string", format: "uuid" },
						quantity: { type: "number" },
						unitPrice: { type: "number" },
						lineTotal: { type: "number" },
						available: { type: "boolean", description: "Live re-check against current stock — can differ from the snapshot taken when the item was added." },
						availabilityReason: { type: "string", nullable: true, example: "Requested quantity exceeds available stock" },
					},
				},
				AddCartItemRequest: {
					type: "object",
					required: ["merchantId", "merchantProductId", "quantity"],
					description: "Adds to (or creates) the caller's active cart for this pharmacy. A caller can hold one active cart per pharmacy at a time — carts for different pharmacies are independent.",
					properties: {
						merchantId: { type: "string", format: "uuid" },
						merchantProductId: { type: "string", format: "uuid" },
						quantity: { type: "number", minimum: 1, example: 2 },
					},
				},
				UpdateCartItemRequest: {
					type: "object",
					required: ["quantity"],
					properties: { quantity: { type: "number", minimum: 1, example: 3 } },
				},
				CreateOrderRequest: {
					type: "object",
					required: ["paymentMethod"],
					description: "Checks out one of the caller's active carts — a caller can hold one active cart per pharmacy simultaneously, so merchantId picks which one (required if more than one is active; inferred if exactly one is). card/bank_transfer initialize a Paystack transaction and require a follow-up call to /orders/{orderId}/payment/confirm. wallet debits the caller's drugstore wallet immediately — no confirm step needed. pay_in_store (pickup only) stays pending until the pharmacy confirms payment. Delivery orders require a delivery address; pickup orders skip it. If the cart's items require it, an approved prescription is required regardless of method.",
					properties: {
						paymentMethod: { type: "string", enum: ["card", "bank_transfer", "wallet", "pay_in_store"], example: "card" },
						fulfillmentMethod: { type: "string", enum: ["delivery", "pickup"], default: "delivery" },
						merchantId: { type: "string", format: "uuid", description: "Which pharmacy's active cart to check out. Required only when the caller has active carts at more than one pharmacy." },
						couponCode: { type: "string", example: "SAVE10" },
						addressId: { type: "string", format: "uuid", description: "Defaults to the caller's default address if omitted. Ignored for pickup." },
						deliveryNote: { type: "string", maxLength: 500 },
						deliveryDate: { type: "string", format: "date" },
						deliveryTimeSlot: { type: "string", maxLength: 60, example: "9am - 12pm" },
						returnUrl: { type: "string", format: "uri", example: "https://app.quickmedic.com/orders/return" },
						savedCardId: { type: "string", format: "uuid", description: "Pay with a previously saved card instead of a new redirect-based card payment. Only used when paymentMethod is card. Resolves synchronously — no separate confirm-payment call needed." },
						saveCard: { type: "boolean", description: "Save the card used for this payment for future reuse. Only relevant when paymentMethod is card and savedCardId is not supplied." },
					},
				},
				CreateOrderResponse: {
					type: "object",
					description: "The payment sub-object shape depends on paymentMethod: card/bank_transfer without a saved card return a Paystack reference/authorizationUrl to redirect to; wallet and saved-card payments resolve immediately and return { method, status: \"paid\" } instead.",
					properties: {
						order: { $ref: "#/components/schemas/DrugstoreOrderResponse" },
						payment: {
							type: "object",
							properties: {
								reference: { type: "string" },
								authorizationUrl: { type: "string" },
								redirectUrl: { type: "string", nullable: true },
								accessCode: { type: "string" },
								amount: { type: "number" },
								currency: { type: "string", example: "NGN" },
								method: { type: "string", enum: ["wallet", "card", "pay_in_store"], description: "Present instead of reference/authorizationUrl when payment resolved immediately (wallet, saved card) or is deferred (pay_in_store)." },
								status: { type: "string", enum: ["paid", "pending"], example: "paid" },
								savedCardId: { type: "string", format: "uuid" },
							},
						},
					},
				},
				ConfirmOrderPaymentRequest: {
					type: "object",
					required: ["paymentReference"],
					description: "Verifies the transaction against Paystack and compares the verified amount to the order total before marking the order paid. Idempotent — confirming an already-paid order with the same reference returns 200 rather than erroring.",
					properties: {
						paymentReference: { type: "string", minLength: 4, maxLength: 120 },
						providerStatus: { type: "string", enum: ["paid", "failed"] },
					},
				},
				CancelOrderRequest: {
					type: "object",
					description: "Only unpaid, unsynced orders can be cancelled. Idempotent — cancelling an already-cancelled order returns 200 rather than erroring.",
					properties: { reason: { type: "string", maxLength: 500 } },
				},
				DrugstoreOrderResponse: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						orderCode: { type: "string", description: "Short human-readable order identifier for display/support (e.g. receipts, order confirmation screens) — not a security token.", example: "RTU4T5" },
						merchantId: { type: "string", format: "uuid" },
						fulfillmentMethod: { type: "string", enum: ["delivery", "pickup"] },
						userId: { type: "number" },
						items: { type: "array", items: { type: "object", properties: { merchantProductId: { type: "string", format: "uuid" }, name: { type: "string" }, quantity: { type: "number" }, unitPrice: { type: "number" }, lineTotal: { type: "number" } } } },
						statusHistory: { type: "array", items: { type: "object", properties: { status: { type: "string" }, note: { type: "string", nullable: true }, createdAt: { type: "string", format: "date-time" } } } },
						totalAmount: { type: "number" },
						paymentStatus: { type: "string", enum: ["pending", "paid", "failed"] },
						deliveryStatus: { type: "string", enum: ["pending", "picked_up", "in_transit", "delivered", "cancelled"] },
						createdAt: { type: "string", format: "date-time" },
					},
				},
				DrugstoreOrdersListResponse: {
					type: "object",
					properties: {
						items: { type: "array", items: { $ref: "#/components/schemas/DrugstoreOrderResponse" } },
						pagination: { type: "object", properties: { total: { type: "number" }, page: { type: "number" }, limit: { type: "number" }, totalPages: { type: "number" } } },
					},
				},
				InternalReviewPrescriptionRequest: {
					type: "object",
					required: ["action", "merchantId"],
					description: "Called only by the merchant service (internalAuth). merchantId is required in the body even though the caller is already merchant-scoped, as a defense-in-depth cross-check.",
					properties: {
						action: { type: "string", enum: ["approved", "rejected", "needs_clarification"] },
						note: { type: "string", maxLength: 500 },
						reviewerName: { type: "string", maxLength: 120 },
						reviewerId: { type: "string", maxLength: 120 },
						merchantId: { type: "string", format: "uuid" },
					},
				},
				InternalOrderStatusSyncRequest: {
					type: "object",
					description: "Called only by the merchant service (internalAuth). Exactly one of sourceOrderId/merchantOrderId must be supplied to identify the order, and at least one of deliveryStatus/paymentStatus. Idempotent — resyncing the same status returns 200 without re-applying it. paymentStatus=paid is only accepted for pay_in_store orders (the pharmacy confirming in-person payment) and re-triggers the merchant sync pipeline just like any other paid order.",
					properties: {
						sourceOrderId: { type: "string", format: "uuid" },
						merchantOrderId: { type: "string", format: "uuid" },
						deliveryStatus: { type: "string", enum: ["pending", "picked_up", "in_transit", "delivered", "cancelled"] },
						paymentStatus: { type: "string", enum: ["paid"] },
					},
				},

				// ---------------------------------------------------------------
				// drugstore category taxonomy & time slots
				// ---------------------------------------------------------------
				DrugstoreCategoryGroupResponse: {
					type: "object",
					description: "Cross-pharmacy taxonomy used for the home screen's Browse by Category and its subcategory drill-down.",
					properties: {
						id: { type: "string", format: "uuid" },
						name: { type: "string", example: "Health & Wellness" },
						slug: { type: "string", example: "health-wellness" },
						imageUrl: { type: "string", nullable: true },
						sortOrder: { type: "number" },
						subcategories: {
							type: "array",
							items: {
								type: "object",
								properties: {
									name: { type: "string", description: "Pass as the `category` filter on GET /drugstore/catalog/products.", example: "Antibiotics" },
									slug: { type: "string", example: "antibiotics" },
									imageUrl: { type: "string", nullable: true },
								},
							},
						},
					},
				},
				TimeSlotsResponse: {
					type: "object",
					properties: {
						fulfillmentMethod: { type: "string", enum: ["delivery", "pickup"] },
						dates: { type: "array", items: { type: "string", format: "date" }, description: "Next 5 selectable dates, including today." },
						slots: {
							type: "object",
							description: "Keyed by date (YYYY-MM-DD). Today's list has already-passed slots filtered out.",
							additionalProperties: { type: "array", items: { type: "string" }, example: ["09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM"] },
						},
					},
				},

				// ---------------------------------------------------------------
				// drugstore wallet & saved cards
				// ---------------------------------------------------------------
				DrugstoreWalletResponse: {
					type: "object",
					description: "Wallet is created lazily with a zero balance on first access — there is no separate 'create wallet' step.",
					properties: {
						balanceKobo: { type: "number", example: 500000 },
						balanceNgn: { type: "number", example: 5000 },
						currency: { type: "string", example: "NGN" },
					},
				},
				FundWalletRequest: {
					type: "object",
					required: ["amountNgn"],
					properties: {
						amountNgn: { type: "number", exclusiveMinimum: 0, example: 5000 },
					},
				},
				WalletFundingInitResponse: {
					type: "object",
					description: "Redirect the user to authorizationUrl to complete payment, then call POST /drugstore/wallet/confirm-funding with reference.",
					properties: {
						reference: { type: "string" },
						authorizationUrl: { type: "string" },
						accessCode: { type: "string" },
						amount: { type: "number", example: 5000 },
						currency: { type: "string", example: "NGN" },
					},
				},
				ConfirmWalletFundingRequest: {
					type: "object",
					required: ["paymentReference"],
					properties: {
						paymentReference: { type: "string", minLength: 4, maxLength: 120 },
					},
				},
				WalletTransactionsResponse: {
					type: "object",
					properties: {
						items: {
							type: "array",
							items: {
								type: "object",
								properties: {
									id: { type: "string", format: "uuid" },
									type: { type: "string", enum: ["credit", "debit"] },
									amount: { type: "number", description: "Kobo, always positive regardless of type.", example: 500000 },
									balanceAfter: { type: "number", example: 0 },
									reference: { type: "string" },
									description: { type: "string", nullable: true },
									orderId: { type: "string", format: "uuid", nullable: true, description: "Set when this transaction is a debit for a drugstore order payment." },
									createdAt: { type: "string", format: "date-time" },
								},
							},
						},
						pagination: { type: "object", properties: { total: { type: "number" }, page: { type: "number" }, limit: { type: "number" }, totalPages: { type: "number" } } },
					},
				},
				SavedCardResponse: {
					type: "object",
					description: "Only masked details are ever returned — the underlying Paystack authorization code is never exposed by any endpoint.",
					properties: {
						id: { type: "string", format: "uuid" },
						last4: { type: "string", example: "3546" },
						cardType: { type: "string", nullable: true, example: "visa" },
						bank: { type: "string", nullable: true, example: "Guaranty Trust Bank" },
						expMonth: { type: "string", nullable: true, example: "08" },
						expYear: { type: "string", nullable: true, example: "2027" },
						isDefault: { type: "boolean" },
					},
				},
			},
		},
		tags: [
			{ name: "Authentication", description: "Signup, login, OTP, and session management for consumers and doctors." },
			{ name: "Permissions", description: "Permission catalog and user-type permission assignment." },
			{ name: "Specialities", description: "Medical speciality catalog used by doctor profiles." },
			{ name: "User Types", description: "Role/user-type catalog." },
			{ name: "Health", description: "Service health checks." },
			{ name: "Consumer Profile", description: "Consumer onboarding and profile management." },
			{ name: "Doctor Profile", description: "Doctor onboarding and profile management." },
			{ name: "Doctor Settings", description: "Doctor app preferences and push-notification device tokens." },
			{ name: "Doctor Rates", description: "Doctor consultation rate and subscription plan management." },
			{ name: "Doctor Reviews", description: "Consumer reviews of completed appointments and doctor replies." },
			{ name: "Doctor Health Packages", description: "Doctor-authored health package listings." },
			{ name: "Appointments", description: "Appointment booking and doctor appointment listing." },
			{ name: "Drugstore", description: "Consumer-facing pharmacy ordering: catalog, cart, prescriptions, and checkout." },
			{ name: "Drugstore Internal", description: "Service-to-service endpoints called only by the merchant backend (HMAC-signed, not user-authenticated)." },
			{ name: "Drugstore Wallet", description: "Drugstore wallet balance/funding and saved cards, used as payment methods at checkout." },
		],
	},
	apis: [path.join(srcPath, "modules/**/*.route.ts"), path.join(srcPath, "modules/**/*.controller.ts")],
};

export const swaggerSpec = swaggerJsdoc(options) as any;
