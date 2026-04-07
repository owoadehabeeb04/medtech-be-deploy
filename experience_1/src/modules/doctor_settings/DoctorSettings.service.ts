import { Sequelize, Transaction } from "sequelize";
import { ApiResponse } from "../../utils/common.dto";
import { DoctorDeviceToken } from "./DoctorDeviceToken.model";
import { DoctorSettings } from "./DoctorSettings.model";
import { UpdateDoctorSettingsPreferencesDTO, UpsertDoctorDeviceTokenDTO } from "./DoctorSettings.dto";

const serializeSettings = (settings: DoctorSettings, activeDeviceTokenCount: number) => ({
	pushNotificationsEnabled: settings.pushNotificationsEnabled,
	biometricLoginEnabled: settings.biometricLoginEnabled,
	autoLogoutOnAppClose: settings.autoLogoutOnAppClose,
	activeDeviceTokenCount,
});

export class DoctorSettingsService {
	private static async ensureSettings(doctorId: number, transaction?: Transaction): Promise<DoctorSettings> {
		const [settings] = await DoctorSettings.findOrCreate({
			where: { doctorId },
			defaults: { doctorId },
			transaction,
		});

		return settings;
	}

	static async getSettings(doctorId: number): Promise<ApiResponse> {
		const settings = await this.ensureSettings(doctorId);
		const activeDeviceTokenCount = await DoctorDeviceToken.count({
			where: { doctorId, isActive: true },
		});

		return {
			status: true,
			code: 200,
			message: "Doctor settings retrieved successfully",
			data: serializeSettings(settings, activeDeviceTokenCount),
		};
	}

	static async updatePreferences(doctorId: number, data: UpdateDoctorSettingsPreferencesDTO): Promise<ApiResponse> {
		const settings = await this.ensureSettings(doctorId);

		await settings.update({
			pushNotificationsEnabled: data.pushNotificationsEnabled ?? settings.pushNotificationsEnabled,
			biometricLoginEnabled: data.biometricLoginEnabled ?? settings.biometricLoginEnabled,
			autoLogoutOnAppClose: data.autoLogoutOnAppClose ?? settings.autoLogoutOnAppClose,
		});

		const activeDeviceTokenCount = await DoctorDeviceToken.count({
			where: { doctorId, isActive: true },
		});

		return {
			status: true,
			code: 200,
			message: "Doctor settings updated successfully",
			data: serializeSettings(settings, activeDeviceTokenCount),
		};
	}

	static async upsertDeviceToken(
		doctorId: number,
		data: UpsertDoctorDeviceTokenDTO,
		sequelize: Sequelize
	): Promise<ApiResponse> {
		const token = await sequelize.transaction(async (transaction) => {
			await this.ensureSettings(doctorId, transaction);

			await DoctorDeviceToken.update(
				{ isActive: false },
				{
					where: {
						deviceToken: data.deviceToken,
						isActive: true,
					},
					transaction,
				}
			);

			const existing = await DoctorDeviceToken.findOne({
				where: { doctorId, deviceId: data.deviceId },
				transaction,
			});

			if (existing) {
				await existing.update(
					{
						deviceToken: data.deviceToken,
						platform: data.platform,
						isActive: true,
						lastSeenAt: new Date(),
					},
					{ transaction }
				);
				return existing;
			}

			return DoctorDeviceToken.create(
				{
					doctorId,
					deviceId: data.deviceId,
					deviceToken: data.deviceToken,
					platform: data.platform,
					isActive: true,
					lastSeenAt: new Date(),
				},
				{ transaction }
			);
		});

		return {
			status: true,
			code: 200,
			message: "Doctor device token saved successfully",
			data: {
				deviceId: token.deviceId,
				platform: token.platform,
				isActive: token.isActive,
				lastSeenAt: token.lastSeenAt,
			},
		};
	}

	static async removeDeviceToken(doctorId: number, deviceId: string): Promise<ApiResponse> {
		const token = await DoctorDeviceToken.findOne({
			where: {
				doctorId,
				deviceId,
				isActive: true,
			},
		});

		if (!token) {
			return {
				status: false,
				code: 404,
				message: "Device token not found",
			};
		}

		await token.update({
			isActive: false,
			lastSeenAt: new Date(),
		});

		return {
			status: true,
			code: 200,
			message: "Doctor device token removed successfully",
			data: {
				deviceId: token.deviceId,
				isActive: token.isActive,
			},
		};
	}
}
