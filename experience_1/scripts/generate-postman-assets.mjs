import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(projectDir, "..");
const postmanDir = path.join(repoDir, "docs", "postman", "experience_1");
const collectionPath = path.join(postmanDir, "experience1-auth-profile.postman_collection.json");
const environmentPath = path.join(postmanDir, "experience1-auth-profile.postman_environment.json");

const variables = [
	["baseUrl", "http://localhost:6200/api/v1/main"],
	["token", ""],
	["refreshToken", ""],
	["consumer_email", "consumer1@example.com"],
	["consumer_password", "StrongPass1!"],
	["consumer_reset_password", "StrongerPass2!"],
	["consumer_phone", "+2348012345678"],
	["doctor_email", "doctor1@example.com"],
	["doctor_password", "StrongPass1!"],
	["doctor_new_password", "StrongerPass2!"],
	["doctor_phone", "+2348099999999"],
	["doctor_license", "LIC12345"],
	["signup_session_id", ""],
	["forgot_session_id", ""],
	["otp_code", ""],
	["education_id", ""],
	["education_id_2", ""],
	["work_id", ""],
	["work_id_2", ""],
	["speciality_id_1", ""],
	["speciality_id_2", ""],
	["speciality_id_3", ""],
	["package_id", ""],
	["userTypeId", ""],
	["userTypeId2", ""],
	["permissionId", ""],
	["permissionId2", ""],
	["permissionId3", ""],
	["device_id", "ios-device-local"],
	["consumer_profile_image_path", "docs/postman/experience_1/fixtures/profile-and-package-image.png"],
	["doctor_profile_image_path", "docs/postman/experience_1/fixtures/profile-and-package-image.png"],
	["health_package_cover_image_path", "docs/postman/experience_1/fixtures/profile-and-package-image.png"],
	["health_package_attachment_path", "docs/postman/experience_1/fixtures/package-attachment.pdf"],
];

const toVariableArray = () =>
	variables.map(([key, value]) => ({
		key,
		value,
	}));

const toEnvironmentValues = () =>
	variables.map(([key, value]) => ({
		key,
		value,
		enabled: true,
	}));

const event = (lines) => [
	{
		listen: "test",
		script: {
			type: "text/javascript",
			exec: lines,
		},
	},
];

const jsonRequest = ({ name, method, path: endpointPath, description, body, noAuth = false, tests }) => ({
	name,
	...(tests ? { event: event(tests) } : {}),
	request: {
		method,
		...(noAuth ? { auth: { type: "noauth" } } : {}),
		header: [
			{
				key: "Content-Type",
				value: "application/json",
			},
		],
		url: {
			raw: `{{baseUrl}}${endpointPath}`,
			host: ["{{baseUrl}}"],
			path: endpointPath.replace(/^\//, "").split("/"),
		},
		...(body
			? {
					body: {
						mode: "raw",
						raw: JSON.stringify(body, null, 2),
					},
			  }
			: {}),
		description,
	},
});

const formRequest = ({ name, method, path: endpointPath, description, fields, files, tests }) => ({
	name,
	...(tests ? { event: event(tests) } : {}),
	request: {
		method,
		header: [],
		url: {
			raw: `{{baseUrl}}${endpointPath}`,
			host: ["{{baseUrl}}"],
			path: endpointPath.replace(/^\//, "").split("/"),
		},
		body: {
			mode: "formdata",
			formdata: [
				...(fields || []).map((field) => ({
					key: field.key,
					value: field.value,
					type: "text",
				})),
				...(files || []).map((file) => ({
					key: file.key,
					type: "file",
					src: file.src,
				})),
			],
		},
		description,
	},
});

const responseSaver = [
	"const responseJson = pm.response.json();",
	"const data = responseJson.data || {};",
];

const saveTokenLines = [
	...responseSaver,
	"if (data.accessToken) pm.collectionVariables.set('token', data.accessToken);",
	"if (data.refreshToken) pm.collectionVariables.set('refreshToken', data.refreshToken);",
];

const collection = {
	info: {
		name: "experience_1 Full API Verification",
		_postman_id: "experience1-full-api-verification",
		description:
			"Generated collection for the currently mounted experience_1 routes under /api/v1/main.\n\nUse `npm run postman:generate` in `experience_1` to refresh this file.\n\nThis collection mirrors the repo-native smoke runner and persists the IDs, OTP sessions, and auth tokens needed across the auth, onboarding, settings, rates, package, appointment, speciality, user type, and permission flows.",
		schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
	},
	variable: toVariableArray(),
	auth: {
		type: "bearer",
		bearer: [
			{
				key: "token",
				value: "{{token}}",
				type: "string",
			},
		],
	},
	item: [
		{
			name: "Health",
			description: "Health checks for the experience_1 API, database, and Redis connection.",
			item: [
				jsonRequest({
					name: "Get Health",
					method: "GET",
					path: "/health",
					noAuth: true,
					description: "Confirm that the app, database, and Redis are up before running dependent flows.",
				}),
			],
		},
		{
			name: "Auth",
			description: "OTP signup, doctor registration, login, refresh, me, change password, and logout flows.",
			item: [
				jsonRequest({
					name: "Request Consumer Signup OTP",
					method: "POST",
					path: "/auth/signup/request-otp",
					noAuth: true,
					body: {
						firstName: "Ada",
						lastName: "Stone",
						email: "{{consumer_email}}",
						role: "consumer",
					},
					description: "Start the consumer OTP signup flow.",
					tests: [
						...responseSaver,
						"if (data.sessionId) pm.collectionVariables.set('signup_session_id', data.sessionId);",
						"if (data.otp) pm.collectionVariables.set('otp_code', data.otp);",
					],
				}),
				jsonRequest({
					name: "Resend Consumer Signup OTP",
					method: "POST",
					path: "/auth/signup/resend-otp",
					noAuth: true,
					body: {
						sessionId: "{{signup_session_id}}",
					},
					description: "Regenerate the consumer signup OTP.",
					tests: [
						...responseSaver,
						"if (data.sessionId) pm.collectionVariables.set('signup_session_id', data.sessionId);",
						"if (data.otp) pm.collectionVariables.set('otp_code', data.otp);",
					],
				}),
				jsonRequest({
					name: "Verify Consumer Signup OTP",
					method: "POST",
					path: "/auth/signup/verify-otp",
					noAuth: true,
					body: {
						sessionId: "{{signup_session_id}}",
						otp: "{{otp_code}}",
					},
					description: "Verify the consumer signup OTP.",
				}),
				jsonRequest({
					name: "Complete Consumer Signup",
					method: "POST",
					path: "/auth/signup/complete",
					noAuth: true,
					body: {
						sessionId: "{{signup_session_id}}",
						password: "{{consumer_password}}",
						confirmPassword: "{{consumer_password}}",
					},
					description: "Complete the consumer signup and persist the shared auth session.",
					tests: saveTokenLines,
				}),
				jsonRequest({
					name: "Register Doctor",
					method: "POST",
					path: "/auth/signup/register",
					noAuth: true,
					body: {
						firstName: "Samuel",
						lastName: "Allen",
						email: "{{doctor_email}}",
						phoneNumber: "{{doctor_phone}}",
						password: "{{doctor_password}}",
						confirmPassword: "{{doctor_password}}",
						role: "doctor",
						medicalLicenseNumber: "{{doctor_license}}",
					},
					description: "Register a doctor directly and persist the shared auth session.",
					tests: saveTokenLines,
				}),
				jsonRequest({
					name: "Login as Consumer",
					method: "POST",
					path: "/auth/login",
					noAuth: true,
					body: {
						email: "{{consumer_email}}",
						password: "{{consumer_password}}",
						role: "consumer",
					},
					description: "Log in as the consumer and overwrite the shared auth session variables.",
					tests: saveTokenLines,
				}),
				jsonRequest({
					name: "Login as Doctor",
					method: "POST",
					path: "/auth/login",
					noAuth: true,
					body: {
						email: "{{doctor_email}}",
						password: "{{doctor_password}}",
						role: "doctor",
					},
					description: "Log in as the doctor and overwrite the shared auth session variables.",
					tests: saveTokenLines,
				}),
				jsonRequest({
					name: "Refresh Token",
					method: "POST",
					path: "/auth/refresh-token",
					noAuth: true,
					body: {
						refreshToken: "{{refreshToken}}",
					},
					description: "Rotate the active access and refresh token pair.",
					tests: saveTokenLines,
				}),
				jsonRequest({
					name: "Get Current User",
					method: "GET",
					path: "/auth/me",
					description: "Return the authenticated user plus profile status and summary.",
				}),
				jsonRequest({
					name: "Change Doctor Password",
					method: "POST",
					path: "/auth/change-password",
					body: {
						oldPassword: "{{doctor_password}}",
						newPassword: "{{doctor_new_password}}",
						confirmNewPassword: "{{doctor_new_password}}",
					},
					description: "Change the password for the authenticated doctor and persist the rotated tokens.",
					tests: saveTokenLines,
				}),
				jsonRequest({
					name: "Logout",
					method: "POST",
					path: "/auth/logout",
					body: {
						refreshToken: "{{refreshToken}}",
					},
					description: "Logout the current session.",
				}),
			],
		},
		{
			name: "Forgot Password",
			description: "OTP-based password reset flow for existing accounts.",
			item: [
				jsonRequest({
					name: "Request Forgot Password OTP",
					method: "POST",
					path: "/auth/forgot-password/request-otp",
					noAuth: true,
					body: {
						email: "{{consumer_email}}",
					},
					description: "Start the forgot-password OTP flow.",
					tests: [
						...responseSaver,
						"if (data.sessionId) pm.collectionVariables.set('forgot_session_id', data.sessionId);",
						"if (data.otp) pm.collectionVariables.set('otp_code', data.otp);",
					],
				}),
				jsonRequest({
					name: "Resend Forgot Password OTP",
					method: "POST",
					path: "/auth/forgot-password/resend-otp",
					noAuth: true,
					body: {
						sessionId: "{{forgot_session_id}}",
					},
					description: "Regenerate the forgot-password OTP.",
					tests: [
						...responseSaver,
						"if (data.sessionId) pm.collectionVariables.set('forgot_session_id', data.sessionId);",
						"if (data.otp) pm.collectionVariables.set('otp_code', data.otp);",
					],
				}),
				jsonRequest({
					name: "Verify Forgot Password OTP",
					method: "POST",
					path: "/auth/forgot-password/verify-otp",
					noAuth: true,
					body: {
						sessionId: "{{forgot_session_id}}",
						otp: "{{otp_code}}",
					},
					description: "Verify the forgot-password OTP.",
				}),
				jsonRequest({
					name: "Reset Password",
					method: "POST",
					path: "/auth/reset-password",
					noAuth: true,
					body: {
						sessionId: "{{forgot_session_id}}",
						newPassword: "{{consumer_reset_password}}",
						confirmPassword: "{{consumer_reset_password}}",
					},
					description: "Reset the password after OTP verification.",
				}),
			],
		},
		{
			name: "Consumer Profile",
			description: "Consumer onboarding profile endpoints.",
			item: [
				jsonRequest({
					name: "Create Consumer Profile",
					method: "POST",
					path: "/consumer/profile",
					body: {
						username: "consumerprofileone",
					},
					description: "Create or upsert the consumer profile with the first onboarding field.",
				}),
				jsonRequest({
					name: "Update Consumer Profile",
					method: "PATCH",
					path: "/consumer/profile",
					body: {
						phoneNumber: "{{consumer_phone}}",
						dateOfBirth: 794707200000,
						houseNumber: "12A",
						streetName: "AllenAvenue",
						localGovernmentArea: "Ikeja",
						state: "Lagos",
					},
					description: "Update the consumer profile with the remaining onboarding fields.",
				}),
				jsonRequest({
					name: "Get Consumer Profile",
					method: "GET",
					path: "/consumer/profile",
					description: "Fetch the current consumer profile and onboarding status.",
				}),
				formRequest({
					name: "Upload Consumer Profile Image",
					method: "POST",
					path: "/consumer/profile/image/upload",
					description: "Upload the consumer profile image using the `file` form field.",
					files: [
						{
							key: "file",
							src: "{{consumer_profile_image_path}}",
						},
					],
				}),
				jsonRequest({
					name: "Skip Consumer Onboarding Step",
					method: "POST",
					path: "/consumer/profile/skip",
					description: "Skip the current consumer onboarding step.",
				}),
			],
		},
		{
			name: "Doctor Onboarding",
			description: "Doctor profile and onboarding endpoints.",
			item: [
				jsonRequest({
					name: "Create Doctor Basic Profile",
					method: "POST",
					path: "/doctor/profile/basic",
					body: {
						firstName: "Samuel",
						lastName: "Allen",
						phoneNumber: "{{doctor_phone}}",
						medicalLicenseNumber: "{{doctor_license}}",
						yearsOfExperience: 8,
						bio: "RemoteCareSpecialist",
					},
					description: "Create the doctor basic profile.",
				}),
				jsonRequest({
					name: "Update Doctor Basic Profile",
					method: "PATCH",
					path: "/doctor/profile/basic",
					body: {
						yearsOfExperience: 9,
						bio: "RemoteCareLead",
					},
					description: "Update the doctor basic profile.",
				}),
				formRequest({
					name: "Upload Doctor Profile Image",
					method: "POST",
					path: "/doctor/profile/image",
					description: "Upload the doctor profile image using the `file` form field.",
					files: [
						{
							key: "file",
							src: "{{doctor_profile_image_path}}",
						},
					],
				}),
				jsonRequest({
					name: "Update Doctor Address",
					method: "POST",
					path: "/doctor/profile/address",
					body: {
						addressLine1: "10BroadStreet",
						addressLine2: "Suite5",
						city: "Lagos",
						state: "Lagos",
					},
					description: "Update the doctor address information.",
				}),
				jsonRequest({
					name: "Create Doctor Education History",
					method: "POST",
					path: "/doctor/profile/education",
					body: {
						institute: "UniLag",
						certificate: "MBBS",
						startDate: 1220227200000,
						endDate: 1404172800000,
					},
					description: "Create a doctor education history record.",
					tests: [
						...responseSaver,
						"if (Array.isArray(data.educationHistory) && data.educationHistory[0]?.id) pm.collectionVariables.set('education_id', data.educationHistory[0].id);",
					],
				}),
				jsonRequest({
					name: "Update Doctor Education History",
					method: "PATCH",
					path: "/doctor/profile/education/{{education_id}}",
					body: {
						institute: "UniLag",
						certificate: "MBBSUpdated",
						startDate: 1220227200000,
						endDate: 1404172800000,
					},
					description: "Update a doctor education history record.",
				}),
				jsonRequest({
					name: "Delete Doctor Education History",
					method: "DELETE",
					path: "/doctor/profile/education/{{education_id}}",
					description: "Delete a doctor education history record.",
				}),
				jsonRequest({
					name: "Create Doctor Work History",
					method: "POST",
					path: "/doctor/profile/work-history",
					body: {
						company: "GeneralHospital",
						designation: "Consultant",
						startDate: 1517443200000,
						endDate: 1612137600000,
					},
					description: "Create a doctor work history record.",
					tests: [
						...responseSaver,
						"if (Array.isArray(data.workHistory) && data.workHistory[0]?.id) pm.collectionVariables.set('work_id', data.workHistory[0].id);",
					],
				}),
				jsonRequest({
					name: "Update Doctor Work History",
					method: "PATCH",
					path: "/doctor/profile/work-history/{{work_id}}",
					body: {
						company: "GeneralHospital",
						designation: "SeniorConsultant",
						startDate: 1517443200000,
						endDate: 1612137600000,
					},
					description: "Update a doctor work history record.",
				}),
				jsonRequest({
					name: "Delete Doctor Work History",
					method: "DELETE",
					path: "/doctor/profile/work-history/{{work_id}}",
					description: "Delete a doctor work history record.",
				}),
				jsonRequest({
					name: "Create Doctor Specialties",
					method: "POST",
					path: "/doctor/profile/specialties",
					body: {
						specialityIds: ["{{speciality_id_1}}"],
						yearsOfExperience: 9,
						bio: "VirtualCareLead",
					},
					description: "Create doctor specialty assignments.",
				}),
				jsonRequest({
					name: "Update Doctor Specialties",
					method: "PATCH",
					path: "/doctor/profile/specialties",
					body: {
						specialityIds: ["{{speciality_id_1}}", "{{speciality_id_2}}"],
						yearsOfExperience: 9,
						bio: "VirtualCareLead",
					},
					description: "Replace doctor specialty assignments.",
				}),
				jsonRequest({
					name: "Complete Doctor Onboarding",
					method: "POST",
					path: "/doctor/profile/complete-onboarding",
					description: "Complete doctor onboarding after all required steps are satisfied.",
				}),
				jsonRequest({
					name: "Get Doctor Profile",
					method: "GET",
					path: "/doctor/profile",
					description: "Fetch the current doctor profile and onboarding status.",
				}),
			],
		},
		{
			name: "Doctor Settings",
			description: "Doctor settings preferences and device token endpoints.",
			item: [
				jsonRequest({
					name: "Get Doctor Settings",
					method: "GET",
					path: "/doctor/settings",
					description: "Fetch the persisted doctor settings row, creating it on first access if needed.",
				}),
				jsonRequest({
					name: "Update Doctor Settings Preferences",
					method: "PATCH",
					path: "/doctor/settings/preferences",
					body: {
						pushNotificationsEnabled: false,
						biometricLoginEnabled: true,
						autoLogoutOnAppClose: true,
					},
					description: "Persist the doctor settings toggle preferences.",
				}),
				jsonRequest({
					name: "Register Doctor Device Token",
					method: "POST",
					path: "/doctor/settings/device-token",
					body: {
						deviceId: "{{device_id}}",
						deviceToken: "device-token-local",
						platform: "ios",
					},
					description: "Save or update the current doctor device token.",
				}),
				jsonRequest({
					name: "Delete Doctor Device Token",
					method: "DELETE",
					path: "/doctor/settings/device-tokens/{{device_id}}",
					description: "Deactivate the doctor device token for the current device.",
				}),
			],
		},
		{
			name: "Doctor Rates",
			description: "Consultation rate and subscription plan endpoints.",
			item: [
				jsonRequest({
					name: "Get Doctor Rates",
					method: "GET",
					path: "/doctor/rates",
					description: "Fetch the doctor consultation rate, subscription plans, and health package preview count.",
				}),
				jsonRequest({
					name: "Upsert Doctor Consultation Rate",
					method: "PUT",
					path: "/doctor/rates/consultation",
					body: {
						amountNgn: 35000,
						durationMinutes: 30,
					},
					description: "Save the doctor consultation rate.",
				}),
				jsonRequest({
					name: "Replace Doctor Subscription Plans",
					method: "PUT",
					path: "/doctor/rates/subscription-plans",
					body: {
						plans: [
							{
								title: "MonthlyRemoteMonitoring",
								amountNgn: 45000,
								durationDays: 30,
								sortOrder: 0,
							},
							{
								title: "QuarterlyCarePlan",
								amountNgn: 120000,
								durationDays: 90,
								sortOrder: 1,
							},
						],
					},
					description: "Replace the current doctor subscription plans in one request.",
				}),
			],
		},
		{
			name: "Doctor Health Packages",
			description: "Doctor health package CRUD and upload endpoints.",
			item: [
				jsonRequest({
					name: "List Doctor Health Packages",
					method: "GET",
					path: "/doctor/health-packages",
					description: "Fetch the active doctor health packages.",
				}),
				formRequest({
					name: "Create Doctor Health Package",
					method: "POST",
					path: "/doctor/health-packages",
					description: "Create a doctor health package with a cover image and attachment.",
					fields: [
						{ key: "title", value: "ColdRemedies" },
						{ key: "priceNgn", value: "2000" },
						{ key: "description", value: "RemoteCareColdReliefPackage" },
					],
					files: [
						{ key: "coverImage", src: "{{health_package_cover_image_path}}" },
						{ key: "attachment", src: "{{health_package_attachment_path}}" },
					],
					tests: [
						...responseSaver,
						"if (data.package?.id) pm.collectionVariables.set('package_id', data.package.id);",
					],
				}),
				jsonRequest({
					name: "Get Doctor Health Package Details",
					method: "GET",
					path: "/doctor/health-packages/{{package_id}}",
					description: "Fetch the full details for a single doctor health package.",
				}),
				formRequest({
					name: "Update Doctor Health Package",
					method: "PATCH",
					path: "/doctor/health-packages/{{package_id}}",
					description: "Update a doctor health package.",
					fields: [
						{ key: "title", value: "UpdatedColdRemedies" },
						{ key: "priceNgn", value: "2500" },
						{ key: "description", value: "UpdatedRemoteCareColdReliefPackage" },
					],
				}),
				jsonRequest({
					name: "Delete Doctor Health Package",
					method: "DELETE",
					path: "/doctor/health-packages/{{package_id}}",
					description: "Soft-delete a doctor health package.",
				}),
			],
		},
		{
			name: "Appointments",
			description: "Appointment booking and doctor appointment listing.",
			item: [
				jsonRequest({
					name: "Book Appointment",
					method: "POST",
					path: "/appointments/book",
					body: {
						age: 31,
						gender: "female",
						medicId: 1,
						scheduleDate: 1767225600000,
						consultationType: "video",
						appointmentType: "personal",
					},
					description: "Book an appointment for the authenticated user.",
				}),
				jsonRequest({
					name: "Get Doctor Appointments",
					method: "GET",
					path: "/appointments",
					description: "Fetch the authenticated doctor's appointments after onboarding is complete.",
				}),
			],
		},
		{
			name: "Specialities",
			description: "Speciality CRUD and bulk creation endpoints.",
			item: [
				jsonRequest({
					name: "Create Speciality 1",
					method: "POST",
					path: "/specialities/create",
					body: {
						name: "PrimarySpeciality",
						key: "primaryspeciality",
						isActive: true,
					},
					description: "Create the first speciality.",
					tests: [
						...responseSaver,
						"if (data.id) pm.collectionVariables.set('speciality_id_1', data.id);",
					],
				}),
				jsonRequest({
					name: "Create Speciality 2",
					method: "POST",
					path: "/specialities/create",
					body: {
						name: "SecondarySpeciality",
						key: "secondaryspeciality",
						isActive: true,
					},
					description: "Create the second speciality.",
					tests: [
						...responseSaver,
						"if (data.id) pm.collectionVariables.set('speciality_id_2', data.id);",
					],
				}),
				jsonRequest({
					name: "Create Speciality 3",
					method: "POST",
					path: "/specialities/create",
					body: {
						name: "CrudSpeciality",
						key: "crudspeciality",
						isActive: true,
					},
					description: "Create the speciality used for get/update/delete coverage.",
					tests: [
						...responseSaver,
						"if (data.id) pm.collectionVariables.set('speciality_id_3', data.id);",
					],
				}),
				jsonRequest({
					name: "Bulk Create Specialities",
					method: "POST",
					path: "/specialities/bulk-create",
					body: {
						specialities: [
							{
								name: "BulkSpecialityOne",
								key: "bulkspecialityone",
								isActive: true,
							},
							{
								name: "BulkSpecialityTwo",
								key: "bulkspecialitytwo",
								isActive: true,
							},
						],
					},
					description: "Create multiple specialities in one request.",
				}),
				jsonRequest({
					name: "Get All Specialities",
					method: "GET",
					path: "/specialities/all",
					description: "Fetch all active specialities.",
				}),
				jsonRequest({
					name: "Get Speciality By Id",
					method: "GET",
					path: "/specialities/id/{{speciality_id_3}}",
					description: "Fetch one speciality by id.",
				}),
				jsonRequest({
					name: "Update Speciality",
					method: "PUT",
					path: "/specialities/id/{{speciality_id_3}}",
					body: {
						name: "UpdatedCrudSpeciality",
						key: "updatedcrudspeciality",
						isActive: true,
					},
					description: "Update a speciality by id.",
				}),
				jsonRequest({
					name: "Delete Speciality",
					method: "DELETE",
					path: "/specialities/id/{{speciality_id_3}}",
					description: "Delete a speciality by id.",
				}),
			],
		},
		{
			name: "User Types",
			description: "User type CRUD endpoints.",
			item: [
				jsonRequest({
					name: "Create User Type 1",
					method: "POST",
					path: "/user-types/create",
					body: {
						name: "VerifyUserType",
						key: "verifyusertype",
						permissionIds: [],
					},
					description: "Create the first test user type.",
					tests: [
						...responseSaver,
						"if (data.id) pm.collectionVariables.set('userTypeId', data.id);",
					],
				}),
				jsonRequest({
					name: "Create User Type 2",
					method: "POST",
					path: "/user-types/create",
					body: {
						name: "VerifyUserTypeTwo",
						key: "verifyusertypetwo",
						permissionIds: [],
					},
					description: "Create the second test user type.",
					tests: [
						...responseSaver,
						"if (data.id) pm.collectionVariables.set('userTypeId2', data.id);",
					],
				}),
				jsonRequest({
					name: "Get All User Types",
					method: "GET",
					path: "/user-types/all",
					description: "Fetch all user types.",
				}),
				jsonRequest({
					name: "Get User Type By Id",
					method: "GET",
					path: "/user-types/id/{{userTypeId}}",
					description: "Fetch one user type by id.",
				}),
				jsonRequest({
					name: "Update User Type",
					method: "POST",
					path: "/user-types/update",
					body: {
						userTypeId: "{{userTypeId}}",
						name: "VerifyUserTypeUpdated",
						key: "verifyusertypeupdated",
						isActive: true,
					},
					description: "Update a user type by id.",
				}),
				jsonRequest({
					name: "Delete User Type 2",
					method: "DELETE",
					path: "/user-types/delete/{{userTypeId2}}",
					description: "Delete the second test user type.",
				}),
				jsonRequest({
					name: "Delete User Type 1",
					method: "DELETE",
					path: "/user-types/delete/{{userTypeId}}",
					description: "Delete the first test user type.",
				}),
			],
		},
		{
			name: "Permissions",
			description: "Permission CRUD and assignment endpoints.",
			item: [
				jsonRequest({
					name: "Create Permission",
					method: "POST",
					path: "/permissions/create",
					body: {
						key: "permissionone",
						name: "PermissionOne",
						description: "PermissionDescription",
						module: "settings",
					},
					description: "Create a single permission.",
					tests: [
						...responseSaver,
						"if (data.id) pm.collectionVariables.set('permissionId', data.id);",
					],
				}),
				jsonRequest({
					name: "Bulk Create Permissions",
					method: "POST",
					path: "/permissions/bulk-create",
					body: {
						permissions: [
							{
								key: "permissiontwo",
								name: "PermissionTwo",
								description: "PermissionTwoDescription",
								module: "settings",
							},
							{
								key: "permissionthree",
								name: "PermissionThree",
								description: "PermissionThreeDescription",
								module: "settings",
							},
						],
					},
					description: "Create multiple permissions in one request.",
				}),
				jsonRequest({
					name: "Get All Permissions",
					method: "GET",
					path: "/permissions/all",
					description: "Fetch all permissions.",
					tests: [
						...responseSaver,
						"if (Array.isArray(data)) {",
						"  const permissionTwo = data.find((item) => item.key === 'permissiontwo');",
						"  const permissionThree = data.find((item) => item.key === 'permissionthree');",
						"  if (permissionTwo?.id) pm.collectionVariables.set('permissionId2', permissionTwo.id);",
						"  if (permissionThree?.id) pm.collectionVariables.set('permissionId3', permissionThree.id);",
						"}",
					],
				}),
				jsonRequest({
					name: "Assign Permissions To User Type",
					method: "POST",
					path: "/permissions/assign",
					body: {
						userTypeId: "{{userTypeId}}",
						permissionIds: ["{{permissionId}}"],
					},
					description: "Replace the permissions assigned to a user type.",
				}),
				jsonRequest({
					name: "Bulk Assign Permissions",
					method: "POST",
					path: "/permissions/bulk-assign",
					body: {
						assignments: [
							{
								userTypeId: "{{userTypeId}}",
								permissionIds: ["{{permissionId}}", "{{permissionId2}}"],
							},
							{
								userTypeId: "{{userTypeId2}}",
								permissionIds: ["{{permissionId3}}"],
							},
						],
					},
					description: "Assign permissions across multiple user types inside one transaction.",
				}),
				jsonRequest({
					name: "Remove Permissions From User Type",
					method: "POST",
					path: "/permissions/remove",
					body: {
						userTypeId: "{{userTypeId}}",
						permissionIds: ["{{permissionId2}}"],
					},
					description: "Remove selected permissions from a user type.",
				}),
				jsonRequest({
					name: "Get User Type Permissions",
					method: "GET",
					path: "/permissions/user-type/{{userTypeId}}",
					description: "Fetch the permissions currently assigned to a user type.",
				}),
			],
		},
	],
};

const environment = {
	id: "experience1-auth-profile-environment",
	name: "experience_1 Local",
	values: toEnvironmentValues(),
	_postman_variable_scope: "environment",
	_postman_exported_at: new Date().toISOString(),
	_postman_exported_using: "Codex",
};

async function writeJson(filePath, data) {
	await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function main() {
	await fs.mkdir(postmanDir, { recursive: true });
	await writeJson(collectionPath, collection);
	await writeJson(environmentPath, environment);
	console.log(`Generated Postman assets:\n- ${collectionPath}\n- ${environmentPath}`);
}

main().catch((error) => {
	console.error(`[postman:generate] ${error.message}`);
	process.exitCode = 1;
});
