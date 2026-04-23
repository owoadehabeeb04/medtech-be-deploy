import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(projectDir, "..");
const fixturesDir = path.join(repoDir, "docs", "postman", "experience_1", "fixtures");
const baseUrl = process.env.VERIFY_BASE_URL || `http://127.0.0.1:${process.env.APP_PORT || 6200}/api/v1/main`;
const shouldStartServer = /^(1|true)$/i.test(process.env.VERIFY_START_SERVER || "");
const keepServerRunning = /^(1|true)$/i.test(process.env.VERIFY_KEEP_SERVER || "");
const runId = Date.now().toString();

const state = {
	consumer: {
		email: `consumer.${runId}@example.com`,
		password: process.env.VERIFY_CONSUMER_PASSWORD || "StrongPass1!",
		resetPassword: process.env.VERIFY_CONSUMER_RESET_PASSWORD || "StrongerPass2!",
		phoneNumber: `+23480${runId.slice(-8)}`,
		token: "",
		refreshToken: "",
		signupSessionId: "",
		forgotSessionId: "",
		otp: "",
		userId: 0,
	},
	doctor: {
		email: `doctor.${runId}@example.com`,
		password: process.env.VERIFY_DOCTOR_PASSWORD || "StrongPass1!",
		newPassword: process.env.VERIFY_DOCTOR_NEW_PASSWORD || "StrongerPass2!",
		phoneNumber: `+23481${runId.slice(-8)}`,
		license: `LIC${runId.slice(-10)}`,
		token: "",
		refreshToken: "",
		userId: 0,
		previousToken: "",
	},
	specialities: {
		primaryId: 0,
		secondaryId: 0,
		crudId: 0,
		bulkKeys: [],
	},
	doctorProfile: {
		educationId: 0,
		educationId2: 0,
		workId: 0,
		workId2: 0,
	},
	doctorSettings: {
		deviceId: `ios-device-${runId}`,
	},
	doctorHealthPackages: {
		packageId: 0,
	},
	userTypes: {
		primaryId: 0,
		secondaryId: 0,
	},
	permissions: {
		primaryId: 0,
		bulkKeys: [],
	},
};

let serverProcess = null;

function log(message) {
	console.log(`[verify:endpoints] ${message}`);
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function expectMessage(body, stepName) {
	assert(body && typeof body === "object", `${stepName} did not return a JSON object`);
	assert(typeof body.message === "string" && body.message.trim().length > 0, `${stepName} did not include a response message`);
}

function extractData(body) {
	return body && typeof body === "object" && "data" in body ? body.data : undefined;
}

function buildUrl(endpointPath, query) {
	const url = new URL(endpointPath.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
	if (query) {
		for (const [key, value] of Object.entries(query)) {
			if (value === undefined || value === null || value === "") continue;
			url.searchParams.set(key, String(value));
		}
	}
	return url;
}

async function parseResponse(response) {
	const rawText = await response.text();
	if (!rawText) return { rawText: "", body: null };

	try {
		return {
			rawText,
			body: JSON.parse(rawText),
		};
	} catch {
		return {
			rawText,
			body: rawText,
		};
	}
}

async function apiStep(stepName, options) {
	const {
		method = "GET",
		path: endpointPath,
		token,
		json,
		formData,
		query,
		headers = {},
		expectedStatus = [200],
	} = options;

	const requestHeaders = new Headers(headers);
	requestHeaders.set("Accept", "application/json");

	let body;
	if (json !== undefined) {
		requestHeaders.set("Content-Type", "application/json");
		body = JSON.stringify(json);
	} else if (formData) {
		body = formData;
	}

	if (token) {
		requestHeaders.set("Authorization", `Bearer ${token}`);
	}

	const response = await fetch(buildUrl(endpointPath, query), {
		method,
		headers: requestHeaders,
		body,
	});

	const { body: parsedBody, rawText } = await parseResponse(response);

	if (!expectedStatus.includes(response.status)) {
		throw new Error(
			`${stepName} failed with ${response.status}.\nExpected: ${expectedStatus.join(", ")}\nResponse: ${typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody || rawText, null, 2)}`
		);
	}

	if (response.status >= 200 && response.status < 300 && parsedBody) {
		expectMessage(parsedBody, stepName);
	}

	log(`${stepName} -> ${response.status}`);

	return {
		status: response.status,
		body: parsedBody,
		data: extractData(parsedBody),
	};
}

function setSession(target, data, stepName) {
	assert(data?.accessToken, `${stepName} did not return an accessToken`);
	assert(data?.refreshToken, `${stepName} did not return a refreshToken`);
	target.token = data.accessToken;
	target.refreshToken = data.refreshToken;
}

function getUserIdFromAuthData(data, stepName) {
	const userId = data?.user?.id;
	assert(Number.isInteger(userId) && userId > 0, `${stepName} did not return a valid user id`);
	return userId;
}

function getArray(value, label) {
	assert(Array.isArray(value), `${label} was not an array`);
	return value;
}

function getObject(value, label) {
	assert(value && typeof value === "object" && !Array.isArray(value), `${label} was not an object`);
	return value;
}

async function createUploadForm(fields, files) {
	const form = new FormData();

	for (const [key, value] of Object.entries(fields || {})) {
		if (value === undefined || value === null) continue;
		form.append(key, String(value));
	}

	for (const file of files || []) {
		if (!file) continue;
		const buffer = await fs.readFile(path.join(fixturesDir, file.fixture));
		form.append(file.field, new Blob([buffer], { type: file.type }), file.filename);
	}

	return form;
}

function unixMillisFromDateParts(year, month, day) {
	return new Date(Date.UTC(year, month - 1, day)).getTime();
}

async function waitForHealth(timeoutMs = 60000) {
	const deadline = Date.now() + timeoutMs;
	let lastError = "Health check not attempted";

	while (Date.now() < deadline) {
		try {
			const response = await apiStep("Health check", {
				path: "/health",
				expectedStatus: [200],
			});

			const data = getObject(response.data, "Health response data");
			assert(data.app?.status === "up", "Application health status was not up");
			assert(data.db?.status === "up", "Database health status was not up");
			assert(data.redis?.status === "up", "Redis health status was not up");
			return;
		} catch (error) {
			lastError = error.message;
			await sleep(1500);
		}
	}

	throw new Error(`Health check timed out: ${lastError}`);
}

async function startServerIfNeeded() {
	if (!shouldStartServer) return;

	serverProcess = spawn("npm", ["run", "start:dev"], {
		cwd: projectDir,
		stdio: ["ignore", "pipe", "pipe"],
		env: process.env,
	});

	serverProcess.stdout.on("data", (chunk) => {
		process.stdout.write(`[experience_1] ${chunk}`);
	});

	serverProcess.stderr.on("data", (chunk) => {
		process.stderr.write(`[experience_1:error] ${chunk}`);
	});

	serverProcess.on("exit", (code) => {
		if (code !== 0 && !keepServerRunning) {
			process.stderr.write(`[experience_1] exited with code ${code}\n`);
		}
	});
}

async function stopServerIfNeeded() {
	if (!serverProcess || keepServerRunning) return;
	serverProcess.kill("SIGTERM");
	await sleep(1000);
	if (!serverProcess.killed) {
		serverProcess.kill("SIGKILL");
	}
}

async function runConsumerFlow() {
	log("Running consumer auth and profile flow");

	const requestOtp = await apiStep("Consumer signup request OTP", {
		method: "POST",
		path: "/auth/signup/request-otp",
		json: {
			firstName: "Ada",
			lastName: "Stone",
			email: state.consumer.email,
			role: "consumer",
		},
		expectedStatus: [200],
	});
	state.consumer.signupSessionId = requestOtp.data?.sessionId || "";
	state.consumer.otp = requestOtp.data?.otp || "";
	assert(state.consumer.signupSessionId, "Consumer signup session id was not returned");
	assert(state.consumer.otp, "Consumer OTP was not returned in development mode");

	const resendOtp = await apiStep("Consumer signup resend OTP", {
		method: "POST",
		path: "/auth/signup/resend-otp",
		json: { sessionId: state.consumer.signupSessionId },
		expectedStatus: [200],
	});
	state.consumer.signupSessionId = resendOtp.data?.sessionId || state.consumer.signupSessionId;
	state.consumer.otp = resendOtp.data?.otp || state.consumer.otp;

	await apiStep("Consumer signup verify OTP", {
		method: "POST",
		path: "/auth/signup/verify-otp",
		json: {
			sessionId: state.consumer.signupSessionId,
			otp: state.consumer.otp,
		},
		expectedStatus: [200],
	});

	const completeSignup = await apiStep("Consumer signup complete", {
		method: "POST",
		path: "/auth/signup/complete",
		json: {
			sessionId: state.consumer.signupSessionId,
			password: state.consumer.password,
			confirmPassword: state.consumer.password,
		},
		expectedStatus: [201],
	});
	setSession(state.consumer, completeSignup.data, "Consumer signup complete");
	state.consumer.userId = getUserIdFromAuthData(completeSignup.data, "Consumer signup complete");

	const login = await apiStep("Consumer login", {
		method: "POST",
		path: "/auth/login",
		json: {
			email: state.consumer.email,
			password: state.consumer.password,
			role: "consumer",
		},
		expectedStatus: [200],
	});
	setSession(state.consumer, login.data, "Consumer login");

	const refresh = await apiStep("Consumer refresh token", {
		method: "POST",
		path: "/auth/refresh-token",
		json: {
			refreshToken: state.consumer.refreshToken,
		},
		expectedStatus: [200],
	});
	setSession(state.consumer, refresh.data, "Consumer refresh token");

	const me = await apiStep("Consumer auth me", {
		path: "/auth/me",
		token: state.consumer.token,
		expectedStatus: [200],
	});
	assert(me.data?.user?.role === "consumer", "Consumer /auth/me did not return a consumer role");

	await apiStep("Consumer create profile", {
		method: "POST",
		path: "/consumer/profile",
		token: state.consumer.token,
		json: {
			username: `consumer${runId.slice(-6)}`,
		},
		expectedStatus: [200],
	});

	await apiStep("Consumer skip current onboarding step", {
		method: "POST",
		path: "/consumer/profile/skip",
		token: state.consumer.token,
		expectedStatus: [200],
	});

	await apiStep("Consumer update profile", {
		method: "PATCH",
		path: "/consumer/profile",
		token: state.consumer.token,
		json: {
			phoneNumber: state.consumer.phoneNumber,
			dateOfBirth: unixMillisFromDateParts(1995, 3, 10),
			houseNumber: "12A",
			streetName: "AllenAvenue",
			localGovernmentArea: "Ikeja",
			state: "Lagos",
		},
		expectedStatus: [200],
	});

	await apiStep("Consumer upload profile image", {
		method: "POST",
		path: "/consumer/profile/image/upload",
		token: state.consumer.token,
		formData: await createUploadForm({}, [
			{
				field: "file",
				fixture: "profile-and-package-image.png",
				filename: "profile-and-package-image.png",
				type: "image/png",
			},
		]),
		expectedStatus: [200],
	});

	const profile = await apiStep("Consumer get profile", {
		path: "/consumer/profile",
		token: state.consumer.token,
		expectedStatus: [200],
	});
	assert(profile.data?.profileStatus, "Consumer profile response did not include profileStatus");
}

async function runDoctorAuthFlow() {
	log("Running doctor auth flow");

	const registerDoctor = await apiStep("Doctor direct register", {
		method: "POST",
		path: "/auth/signup/register",
		json: {
			firstName: "Samuel",
			lastName: "Allen",
			email: state.doctor.email,
			phoneNumber: state.doctor.phoneNumber,
			password: state.doctor.password,
			confirmPassword: state.doctor.password,
			role: "doctor",
			medicalLicenseNumber: state.doctor.license,
		},
		expectedStatus: [201],
	});
	setSession(state.doctor, registerDoctor.data, "Doctor register");
	state.doctor.userId = getUserIdFromAuthData(registerDoctor.data, "Doctor register");

	const login = await apiStep("Doctor login", {
		method: "POST",
		path: "/auth/login",
		json: {
			email: state.doctor.email,
			password: state.doctor.password,
			role: "doctor",
		},
		expectedStatus: [200],
	});
	setSession(state.doctor, login.data, "Doctor login");

	const refresh = await apiStep("Doctor refresh token", {
		method: "POST",
		path: "/auth/refresh-token",
		json: {
			refreshToken: state.doctor.refreshToken,
		},
		expectedStatus: [200],
	});
	setSession(state.doctor, refresh.data, "Doctor refresh token");

	const me = await apiStep("Doctor auth me", {
		path: "/auth/me",
		token: state.doctor.token,
		expectedStatus: [200],
	});
	assert(me.data?.user?.role === "doctor", "Doctor /auth/me did not return a doctor role");

	await apiStep("Doctor change password rejects wrong old password", {
		method: "POST",
		path: "/auth/change-password",
		token: state.doctor.token,
		json: {
			oldPassword: "WrongPass1!",
			newPassword: state.doctor.newPassword,
			confirmNewPassword: state.doctor.newPassword,
		},
		expectedStatus: [400],
	});

	await apiStep("Doctor appointments reject incomplete onboarding", {
		path: "/appointments",
		token: state.doctor.token,
		expectedStatus: [403],
	});

	state.doctor.previousToken = state.doctor.token;

	const changePassword = await apiStep("Doctor change password", {
		method: "POST",
		path: "/auth/change-password",
		token: state.doctor.token,
		json: {
			oldPassword: state.doctor.password,
			newPassword: state.doctor.newPassword,
			confirmNewPassword: state.doctor.newPassword,
		},
		expectedStatus: [200],
	});
	setSession(state.doctor, changePassword.data, "Doctor change password");

	await apiStep("Doctor old token invalid after password change", {
		path: "/auth/me",
		token: state.doctor.previousToken,
		expectedStatus: [401],
	});

	await apiStep("Doctor login with old password rejected", {
		method: "POST",
		path: "/auth/login",
		json: {
			email: state.doctor.email,
			password: state.doctor.password,
			role: "doctor",
		},
		expectedStatus: [401],
	});

	const loginNewPassword = await apiStep("Doctor login with new password", {
		method: "POST",
		path: "/auth/login",
		json: {
			email: state.doctor.email,
			password: state.doctor.newPassword,
			role: "doctor",
		},
		expectedStatus: [200],
	});
	setSession(state.doctor, loginNewPassword.data, "Doctor login with new password");
}

async function runSpecialityFlow() {
	log("Running speciality flow");

	const createPrimary = await apiStep("Create primary speciality", {
		method: "POST",
		path: "/specialities/create",
		token: state.doctor.token,
		json: {
			name: `PrimarySpeciality${runId.slice(-5)}`,
			key: `primaryspeciality${runId.slice(-8)}`,
			isActive: true,
		},
		expectedStatus: [200],
	});
	state.specialities.primaryId = createPrimary.data?.id;

	const createSecondary = await apiStep("Create secondary speciality", {
		method: "POST",
		path: "/specialities/create",
		token: state.doctor.token,
		json: {
			name: `SecondarySpeciality${runId.slice(-5)}`,
			key: `secondaryspeciality${runId.slice(-8)}`,
			isActive: true,
		},
		expectedStatus: [200],
	});
	state.specialities.secondaryId = createSecondary.data?.id;

	const createCrud = await apiStep("Create CRUD speciality", {
		method: "POST",
		path: "/specialities/create",
		token: state.doctor.token,
		json: {
			name: `CrudSpeciality${runId.slice(-5)}`,
			key: `crudspeciality${runId.slice(-8)}`,
			isActive: true,
		},
		expectedStatus: [200],
	});
	state.specialities.crudId = createCrud.data?.id;

	assert(state.specialities.primaryId > 0, "Primary speciality id was not returned");
	assert(state.specialities.secondaryId > 0, "Secondary speciality id was not returned");
	assert(state.specialities.crudId > 0, "CRUD speciality id was not returned");

	const bulkKeys = [`bulkspecialitya${runId.slice(-6)}`, `bulkspecialityb${runId.slice(-6)}`];
	state.specialities.bulkKeys = bulkKeys;
	await apiStep("Bulk create specialities", {
		method: "POST",
		path: "/specialities/bulk-create",
		token: state.doctor.token,
		json: {
			specialities: bulkKeys.map((key, index) => ({
				name: `BulkSpeciality${index + 1}${runId.slice(-4)}`,
				key,
				isActive: true,
			})),
		},
		expectedStatus: [200],
	});

	const allSpecialities = await apiStep("Get all specialities", {
		path: "/specialities/all",
		token: state.doctor.token,
		expectedStatus: [200],
	});
	const specialityList = getArray(allSpecialities.data, "All specialities");
	assert(
		specialityList.some((item) => item.id === state.specialities.primaryId),
		"Primary speciality missing from /specialities/all"
	);

	const specialityById = await apiStep("Get speciality by id", {
		path: `/specialities/id/${state.specialities.crudId}`,
		token: state.doctor.token,
		expectedStatus: [200],
	});
	assert(specialityById.data?.id === state.specialities.crudId, "Get speciality by id returned the wrong record");

	await apiStep("Update speciality", {
		method: "PUT",
		path: `/specialities/id/${state.specialities.crudId}`,
		token: state.doctor.token,
		json: {
			name: `UpdatedCrudSpeciality${runId.slice(-5)}`,
			key: `updatedcrudspeciality${runId.slice(-8)}`,
			isActive: true,
		},
		expectedStatus: [200],
	});

	await apiStep("Delete speciality", {
		method: "DELETE",
		path: `/specialities/id/${state.specialities.crudId}`,
		token: state.doctor.token,
		expectedStatus: [200],
	});
}

async function runDoctorOnboardingFlow() {
	log("Running doctor onboarding flow");

	await apiStep("Doctor create basic profile", {
		method: "POST",
		path: "/doctor/profile/basic",
		token: state.doctor.token,
		json: {
			firstName: "Samuel",
			lastName: "Allen",
			phoneNumber: state.doctor.phoneNumber,
			medicalLicenseNumber: state.doctor.license,
			yearsOfExperience: 8,
			bio: "RemoteCareSpecialist",
		},
		expectedStatus: [200],
	});

	await apiStep("Doctor update basic profile", {
		method: "PATCH",
		path: "/doctor/profile/basic",
		token: state.doctor.token,
		json: {
			yearsOfExperience: 9,
			bio: "RemoteCareLead",
		},
		expectedStatus: [200],
	});

	await apiStep("Doctor upload profile image", {
		method: "POST",
		path: "/doctor/profile/image",
		token: state.doctor.token,
		formData: await createUploadForm({}, [
			{
				field: "file",
				fixture: "profile-and-package-image.png",
				filename: "doctor-profile-image.png",
				type: "image/png",
			},
		]),
		expectedStatus: [200],
	});

	await apiStep("Doctor update address", {
		method: "POST",
		path: "/doctor/profile/address",
		token: state.doctor.token,
		json: {
			addressLine1: "10BroadStreet",
			addressLine2: "Suite5",
			city: "Lagos",
			state: "Lagos",
		},
		expectedStatus: [200],
	});

	const educationA = await apiStep("Doctor create education history A", {
		method: "POST",
		path: "/doctor/profile/education",
		token: state.doctor.token,
		json: {
			institute: "UniLag",
			certificate: "MBBS",
			startDate: unixMillisFromDateParts(2008, 9, 1),
			endDate: unixMillisFromDateParts(2014, 7, 1),
		},
		expectedStatus: [200],
	});
	const educationHistoryA = getArray(educationA.data?.educationHistory, "Doctor education history after create A");
	state.doctorProfile.educationId = educationHistoryA[0]?.id || 0;
	assert(state.doctorProfile.educationId > 0, "Doctor education id A was not returned");

	await apiStep("Doctor update education history A", {
		method: "PATCH",
		path: `/doctor/profile/education/${state.doctorProfile.educationId}`,
		token: state.doctor.token,
		json: {
			institute: "UniLag",
			certificate: "MBBSUpdated",
			startDate: unixMillisFromDateParts(2008, 9, 1),
			endDate: unixMillisFromDateParts(2014, 7, 1),
		},
		expectedStatus: [200],
	});

	const educationB = await apiStep("Doctor create education history B", {
		method: "POST",
		path: "/doctor/profile/education",
		token: state.doctor.token,
		json: {
			institute: "LUTH",
			certificate: "Residency",
			startDate: unixMillisFromDateParts(2015, 1, 1),
			endDate: unixMillisFromDateParts(2018, 1, 1),
		},
		expectedStatus: [200],
	});
	const educationHistoryB = getArray(educationB.data?.educationHistory, "Doctor education history after create B");
	state.doctorProfile.educationId2 =
		educationHistoryB.find((item) => item.id !== state.doctorProfile.educationId)?.id || 0;
	assert(state.doctorProfile.educationId2 > 0, "Doctor education id B was not returned");

	await apiStep("Doctor delete education history B", {
		method: "DELETE",
		path: `/doctor/profile/education/${state.doctorProfile.educationId2}`,
		token: state.doctor.token,
		expectedStatus: [200],
	});

	const workA = await apiStep("Doctor create work history A", {
		method: "POST",
		path: "/doctor/profile/work-history",
		token: state.doctor.token,
		json: {
			company: "GeneralHospital",
			designation: "Consultant",
			startDate: unixMillisFromDateParts(2018, 2, 1),
			endDate: unixMillisFromDateParts(2021, 2, 1),
		},
		expectedStatus: [200],
	});
	const workHistoryA = getArray(workA.data?.workHistory, "Doctor work history after create A");
	state.doctorProfile.workId = workHistoryA[0]?.id || 0;
	assert(state.doctorProfile.workId > 0, "Doctor work id A was not returned");

	await apiStep("Doctor update work history A", {
		method: "PATCH",
		path: `/doctor/profile/work-history/${state.doctorProfile.workId}`,
		token: state.doctor.token,
		json: {
			company: "GeneralHospital",
			designation: "SeniorConsultant",
			startDate: unixMillisFromDateParts(2018, 2, 1),
			endDate: unixMillisFromDateParts(2021, 2, 1),
		},
		expectedStatus: [200],
	});

	const workB = await apiStep("Doctor create work history B", {
		method: "POST",
		path: "/doctor/profile/work-history",
		token: state.doctor.token,
		json: {
			company: "CareClinic",
			designation: "Advisor",
			startDate: unixMillisFromDateParts(2021, 3, 1),
			endDate: unixMillisFromDateParts(2023, 3, 1),
		},
		expectedStatus: [200],
	});
	const workHistoryB = getArray(workB.data?.workHistory, "Doctor work history after create B");
	state.doctorProfile.workId2 = workHistoryB.find((item) => item.id !== state.doctorProfile.workId)?.id || 0;
	assert(state.doctorProfile.workId2 > 0, "Doctor work id B was not returned");

	await apiStep("Doctor delete work history B", {
		method: "DELETE",
		path: `/doctor/profile/work-history/${state.doctorProfile.workId2}`,
		token: state.doctor.token,
		expectedStatus: [200],
	});

	await apiStep("Doctor create specialties", {
		method: "POST",
		path: "/doctor/profile/specialties",
		token: state.doctor.token,
		json: {
			specialityIds: [state.specialities.primaryId],
			yearsOfExperience: 9,
			bio: "VirtualCareLead",
		},
		expectedStatus: [200],
	});

	await apiStep("Doctor update specialties", {
		method: "PATCH",
		path: "/doctor/profile/specialties",
		token: state.doctor.token,
		json: {
			specialityIds: [state.specialities.primaryId, state.specialities.secondaryId],
			yearsOfExperience: 9,
			bio: "VirtualCareLead",
		},
		expectedStatus: [200],
	});

	await apiStep("Doctor complete onboarding", {
		method: "POST",
		path: "/doctor/profile/complete-onboarding",
		token: state.doctor.token,
		expectedStatus: [200],
	});

	const profile = await apiStep("Doctor get profile", {
		path: "/doctor/profile",
		token: state.doctor.token,
		expectedStatus: [200],
	});
	assert(profile.data?.profileStatus?.onboardingCompleted === true, "Doctor profile did not report onboardingCompleted=true");
}

async function runDoctorSettingsAndRatesFlow() {
	log("Running doctor settings and rates flow");

	await apiStep("Doctor settings reject missing token", {
		path: "/doctor/settings",
		expectedStatus: [401],
	});

	await apiStep("Doctor settings reject consumer role", {
		path: "/doctor/settings",
		token: state.consumer.token,
		expectedStatus: [403],
	});

	const settings = await apiStep("Doctor get settings", {
		path: "/doctor/settings",
		token: state.doctor.token,
		expectedStatus: [200],
	});
	assert(settings.data?.pushNotificationsEnabled === true, "Doctor settings default pushNotificationsEnabled should be true");
	assert(settings.data?.biometricLoginEnabled === false, "Doctor settings default biometricLoginEnabled should be false");
	assert(settings.data?.autoLogoutOnAppClose === false, "Doctor settings default autoLogoutOnAppClose should be false");

	const updatedSettings = await apiStep("Doctor update settings preferences", {
		method: "PATCH",
		path: "/doctor/settings/preferences",
		token: state.doctor.token,
		json: {
			pushNotificationsEnabled: false,
			biometricLoginEnabled: true,
			autoLogoutOnAppClose: true,
		},
		expectedStatus: [200],
	});
	assert(updatedSettings.data?.pushNotificationsEnabled === false, "Doctor settings preference update did not persist pushNotificationsEnabled");
	assert(updatedSettings.data?.biometricLoginEnabled === true, "Doctor settings preference update did not persist biometricLoginEnabled");
	assert(updatedSettings.data?.autoLogoutOnAppClose === true, "Doctor settings preference update did not persist autoLogoutOnAppClose");

	await apiStep("Doctor save device token", {
		method: "POST",
		path: "/doctor/settings/device-token",
		token: state.doctor.token,
		json: {
			deviceId: state.doctorSettings.deviceId,
			deviceToken: `device-token-${runId}`,
			platform: "ios",
		},
		expectedStatus: [200],
	});

	await apiStep("Doctor remove device token", {
		method: "DELETE",
		path: `/doctor/settings/device-tokens/${state.doctorSettings.deviceId}`,
		token: state.doctor.token,
		expectedStatus: [200],
	});

	const emptyRates = await apiStep("Doctor get rates empty summary", {
		path: "/doctor/rates",
		token: state.doctor.token,
		expectedStatus: [200],
	});
	assert(emptyRates.data?.consultationRate === null, "Doctor empty rates summary should return consultationRate=null");
	assert(Array.isArray(emptyRates.data?.subscriptionPlans) && emptyRates.data.subscriptionPlans.length === 0, "Doctor empty rates summary should return no subscription plans");
	assert(emptyRates.data?.healthPackagesPreviewCount === 0, "Doctor empty rates summary should return healthPackagesPreviewCount=0");

	const consultationRate = await apiStep("Doctor upsert consultation rate", {
		method: "PUT",
		path: "/doctor/rates/consultation",
		token: state.doctor.token,
		json: {
			amountNgn: 35000,
			durationMinutes: 30,
		},
		expectedStatus: [200],
	});
	assert(consultationRate.data?.consultationRate?.amountKobo === 3500000, "Doctor consultation rate kobo normalization was incorrect");

	await apiStep("Doctor replace subscription plans", {
		method: "PUT",
		path: "/doctor/rates/subscription-plans",
		token: state.doctor.token,
		json: {
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
		expectedStatus: [200],
	});

	const populatedRates = await apiStep("Doctor get populated rates summary", {
		path: "/doctor/rates",
		token: state.doctor.token,
		expectedStatus: [200],
	});
	assert(populatedRates.data?.consultationRate?.amountNgn === 35000, "Doctor populated rates summary returned the wrong consultation amount");
	assert(populatedRates.data?.subscriptionPlans?.length === 2, "Doctor populated rates summary did not return two subscription plans");
}

async function runDoctorHealthPackageFlow() {
	log("Running doctor health package flow");

	const initialList = await apiStep("Doctor list health packages initially", {
		path: "/doctor/health-packages",
		token: state.doctor.token,
		expectedStatus: [200],
	});
	assert(Array.isArray(initialList.data?.packages), "Doctor health package list should return a packages array");
	assert(initialList.data.packages.length === 0, "Doctor health package list should start empty");

	const createPackage = await apiStep("Doctor create health package", {
		method: "POST",
		path: "/doctor/health-packages",
		token: state.doctor.token,
		formData: await createUploadForm(
			{
				title: `ColdRemedies${runId.slice(-5)}`,
				priceNgn: 2000,
				description: "RemoteCareColdReliefPackage",
			},
			[
				{
					field: "coverImage",
					fixture: "profile-and-package-image.png",
					filename: "health-package-cover.png",
					type: "image/png",
				},
				{
					field: "attachment",
					fixture: "package-attachment.pdf",
					filename: "health-package-attachment.pdf",
					type: "application/pdf",
				},
			]
		),
		expectedStatus: [201],
	});
	state.doctorHealthPackages.packageId = createPackage.data?.package?.id || 0;
	assert(state.doctorHealthPackages.packageId > 0, "Doctor health package id was not returned");
	assert(createPackage.data?.package?.priceKobo === 200000, "Doctor health package price normalization was incorrect");

	const getPackage = await apiStep("Doctor get health package details", {
		path: `/doctor/health-packages/${state.doctorHealthPackages.packageId}`,
		token: state.doctor.token,
		expectedStatus: [200],
	});
	assert(getPackage.data?.package?.attachmentUrl, "Doctor health package details did not include attachmentUrl");

	await apiStep("Doctor health package rejects consumer role", {
		path: `/doctor/health-packages/${state.doctorHealthPackages.packageId}`,
		token: state.consumer.token,
		expectedStatus: [403],
	});

	await apiStep("Doctor update health package text only", {
		method: "PATCH",
		path: `/doctor/health-packages/${state.doctorHealthPackages.packageId}`,
		token: state.doctor.token,
		formData: await createUploadForm({
			title: `UpdatedColdRemedies${runId.slice(-5)}`,
			priceNgn: 2500,
			description: "UpdatedRemoteCareColdReliefPackage",
		}),
		expectedStatus: [200],
	});

	await apiStep("Doctor update health package cover image only", {
		method: "PATCH",
		path: `/doctor/health-packages/${state.doctorHealthPackages.packageId}`,
		token: state.doctor.token,
		formData: await createUploadForm({}, [
			{
				field: "coverImage",
				fixture: "profile-and-package-image.png",
				filename: "updated-health-package-cover.png",
				type: "image/png",
			},
		]),
		expectedStatus: [200],
	});

	await apiStep("Doctor update health package attachment only", {
		method: "PATCH",
		path: `/doctor/health-packages/${state.doctorHealthPackages.packageId}`,
		token: state.doctor.token,
		formData: await createUploadForm({}, [
			{
				field: "attachment",
				fixture: "package-attachment.pdf",
				filename: "updated-health-package-attachment.pdf",
				type: "application/pdf",
			},
		]),
		expectedStatus: [200],
	});

	const populatedRates = await apiStep("Doctor rates reflect health package preview count", {
		path: "/doctor/rates",
		token: state.doctor.token,
		expectedStatus: [200],
	});
	assert(populatedRates.data?.healthPackagesPreviewCount === 1, "Doctor rates did not reflect the new health package preview count");

	await apiStep("Doctor delete health package", {
		method: "DELETE",
		path: `/doctor/health-packages/${state.doctorHealthPackages.packageId}`,
		token: state.doctor.token,
		expectedStatus: [200],
	});

	const afterDelete = await apiStep("Doctor list health packages after delete", {
		path: "/doctor/health-packages",
		token: state.doctor.token,
		expectedStatus: [200],
	});
	assert(
		!afterDelete.data?.packages?.some((item) => item.id === state.doctorHealthPackages.packageId),
		"Deleted doctor health package was still returned in the active list"
	);
}

async function runAppointmentsFlow() {
	log("Running appointment flow");

	await apiStep("Consumer book appointment", {
		method: "POST",
		path: "/appointments/book",
		token: state.consumer.token,
		json: {
			age: 31,
			gender: "female",
			medicId: state.doctor.userId,
			scheduleDate: Date.now() + 1000 * 60 * 60 * 24 * 2,
			consultationType: "video",
			appointmentType: "personal",
		},
		expectedStatus: [200],
	});

	const doctorAppointments = await apiStep("Doctor list appointments after onboarding", {
		path: "/appointments",
		token: state.doctor.token,
		expectedStatus: [200],
	});
	const appointmentPage = getObject(doctorAppointments.data, "Doctor appointments payload");
	const appointments = getArray(appointmentPage.data, "Doctor appointments page data");
	assert(appointments.length >= 1, "Doctor appointments list should contain the booked appointment");
}

async function runUserTypesAndPermissionsFlow() {
	log("Running user type and permission flow");

	const createUserTypePrimary = await apiStep("Create user type primary", {
		method: "POST",
		path: "/user-types/create",
		token: state.doctor.token,
		json: {
			name: `VerifyUserType${runId.slice(-5)}`,
			key: `verifyusertype${runId.slice(-8)}`,
			permissionIds: [],
		},
		expectedStatus: [200],
	});
	state.userTypes.primaryId = createUserTypePrimary.data?.id || 0;
	assert(state.userTypes.primaryId > 0, "Primary user type id was not returned");

	const createUserTypeSecondary = await apiStep("Create user type secondary", {
		method: "POST",
		path: "/user-types/create",
		token: state.doctor.token,
		json: {
			name: `VerifyUserTypeB${runId.slice(-5)}`,
			key: `verifyusertypeb${runId.slice(-8)}`,
			permissionIds: [],
		},
		expectedStatus: [200],
	});
	state.userTypes.secondaryId = createUserTypeSecondary.data?.id || 0;
	assert(state.userTypes.secondaryId > 0, "Secondary user type id was not returned");

	const allUserTypes = await apiStep("Get all user types", {
		path: "/user-types/all",
		token: state.doctor.token,
		expectedStatus: [200],
	});
	const userTypeList = getArray(allUserTypes.data, "All user types");
	assert(userTypeList.some((item) => item.id === state.userTypes.primaryId), "Primary user type missing from /user-types/all");

	const userTypeById = await apiStep("Get user type by id", {
		path: `/user-types/id/${state.userTypes.primaryId}`,
		token: state.doctor.token,
		expectedStatus: [200],
	});
	assert(userTypeById.data?.id === state.userTypes.primaryId, "Get user type by id returned the wrong record");

	await apiStep("Update user type", {
		method: "POST",
		path: "/user-types/update",
		token: state.doctor.token,
		json: {
			userTypeId: state.userTypes.primaryId,
			name: `VerifyUserTypeUpdated${runId.slice(-5)}`,
			key: `verifyusertypeupdated${runId.slice(-8)}`,
			isActive: true,
		},
		expectedStatus: [200],
	});

	const createPermission = await apiStep("Create permission", {
		method: "POST",
		path: "/permissions/create",
		token: state.doctor.token,
		json: {
			key: `permission${runId.slice(-8)}`,
			name: `Permission${runId.slice(-5)}`,
			description: "PermissionDescription",
			module: "settings",
		},
		expectedStatus: [200],
	});
	state.permissions.primaryId = createPermission.data?.id || 0;
	assert(state.permissions.primaryId > 0, "Primary permission id was not returned");

	state.permissions.bulkKeys = [`permissionbulk${runId.slice(-7)}a`, `permissionbulk${runId.slice(-7)}b`];
	await apiStep("Bulk create permissions", {
		method: "POST",
		path: "/permissions/bulk-create",
		token: state.doctor.token,
		json: {
			permissions: state.permissions.bulkKeys.map((key, index) => ({
				key,
				name: `BulkPermission${index + 1}${runId.slice(-4)}`,
				description: `BulkPermissionDescription${index + 1}`,
				module: "settings",
			})),
		},
		expectedStatus: [200],
	});

	const allPermissions = await apiStep("Get all permissions", {
		path: "/permissions/all",
		token: state.doctor.token,
		expectedStatus: [200],
	});
	const permissionList = getArray(allPermissions.data, "All permissions");
	const bulkPermissionIds = state.permissions.bulkKeys.map((key) => {
		const match = permissionList.find((item) => item.key === key);
		assert(match?.id, `Bulk permission with key ${key} was not found`);
		return match.id;
	});

	await apiStep("Assign permissions to user type", {
		method: "POST",
		path: "/permissions/assign",
		token: state.doctor.token,
		json: {
			userTypeId: state.userTypes.primaryId,
			permissionIds: [state.permissions.primaryId],
		},
		expectedStatus: [200],
	});

	await apiStep("Bulk assign permissions", {
		method: "POST",
		path: "/permissions/bulk-assign",
		token: state.doctor.token,
		json: {
			assignments: [
				{
					userTypeId: state.userTypes.primaryId,
					permissionIds: [state.permissions.primaryId, bulkPermissionIds[0]],
				},
				{
					userTypeId: state.userTypes.secondaryId,
					permissionIds: [bulkPermissionIds[1]],
				},
			],
		},
		expectedStatus: [200],
	});

	await apiStep("Remove permissions from user type", {
		method: "POST",
		path: "/permissions/remove",
		token: state.doctor.token,
		json: {
			userTypeId: state.userTypes.primaryId,
			permissionIds: [bulkPermissionIds[0]],
		},
		expectedStatus: [200],
	});

	const permissionsByUserType = await apiStep("Get permissions by user type", {
		path: `/permissions/user-type/${state.userTypes.primaryId}`,
		token: state.doctor.token,
		expectedStatus: [200],
	});
	assert(
		Array.isArray(permissionsByUserType.data?.permissions),
		"Get permissions by user type did not return a permissions array"
	);

	await apiStep("Delete user type secondary", {
		method: "DELETE",
		path: `/user-types/delete/${state.userTypes.secondaryId}`,
		token: state.doctor.token,
		expectedStatus: [200],
	});

	await apiStep("Delete user type primary", {
		method: "DELETE",
		path: `/user-types/delete/${state.userTypes.primaryId}`,
		token: state.doctor.token,
		expectedStatus: [200],
	});
}

async function runConsumerLogoutAndForgotPasswordFlow() {
	log("Running logout and forgot password flow");

	await apiStep("Consumer logout", {
		method: "POST",
		path: "/auth/logout",
		token: state.consumer.token,
		json: {
			refreshToken: state.consumer.refreshToken,
		},
		expectedStatus: [200],
	});

	await apiStep("Consumer token invalid after logout", {
		path: "/auth/me",
		token: state.consumer.token,
		expectedStatus: [401],
	});

	const forgotRequest = await apiStep("Forgot password request OTP", {
		method: "POST",
		path: "/auth/forgot-password/request-otp",
		json: {
			email: state.consumer.email,
		},
		expectedStatus: [200],
	});
	state.consumer.forgotSessionId = forgotRequest.data?.sessionId || "";
	state.consumer.otp = forgotRequest.data?.otp || "";
	assert(state.consumer.forgotSessionId, "Forgot password session id was not returned");
	assert(state.consumer.otp, "Forgot password OTP was not returned in development mode");

	const forgotResend = await apiStep("Forgot password resend OTP", {
		method: "POST",
		path: "/auth/forgot-password/resend-otp",
		json: {
			sessionId: state.consumer.forgotSessionId,
		},
		expectedStatus: [200],
	});
	state.consumer.forgotSessionId = forgotResend.data?.sessionId || state.consumer.forgotSessionId;
	state.consumer.otp = forgotResend.data?.otp || state.consumer.otp;

	await apiStep("Forgot password verify OTP", {
		method: "POST",
		path: "/auth/forgot-password/verify-otp",
		json: {
			sessionId: state.consumer.forgotSessionId,
			otp: state.consumer.otp,
		},
		expectedStatus: [200],
	});

	await apiStep("Reset password", {
		method: "POST",
		path: "/auth/reset-password",
		json: {
			sessionId: state.consumer.forgotSessionId,
			newPassword: state.consumer.resetPassword,
			confirmPassword: state.consumer.resetPassword,
		},
		expectedStatus: [200],
	});

	const login = await apiStep("Consumer login with reset password", {
		method: "POST",
		path: "/auth/login",
		json: {
			email: state.consumer.email,
			password: state.consumer.resetPassword,
			role: "consumer",
		},
		expectedStatus: [200],
	});
	setSession(state.consumer, login.data, "Consumer login with reset password");
}

async function main() {
	try {
		await startServerIfNeeded();
		await waitForHealth();

		await runConsumerFlow();
		await runDoctorAuthFlow();
		await runSpecialityFlow();
		await runDoctorOnboardingFlow();
		await runDoctorSettingsAndRatesFlow();
		await runDoctorHealthPackageFlow();
		await runAppointmentsFlow();
		await runUserTypesAndPermissionsFlow();
		await runConsumerLogoutAndForgotPasswordFlow();

		log("All endpoint smoke checks passed.");
	} finally {
		await stopServerIfNeeded();
	}
}

main().catch((error) => {
	console.error(`\n[verify:endpoints] FAILED\n${error.stack || error.message}`);
	process.exitCode = 1;
});
