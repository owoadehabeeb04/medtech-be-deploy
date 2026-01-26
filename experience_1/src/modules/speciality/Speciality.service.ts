import { RESPONSE_MESSAGES } from "../../constants/response";
import { ApiResponse } from "../../utils/common.dto";
import { Speciality } from "./Speciality.model";

export class SpecialityService {
	// CREATE
	static async createSpeciality(payload: { name: string; key: string; isActive?: boolean }): Promise<ApiResponse> {
		const exists = await Speciality.getSpecialityByKey(payload.key.toLowerCase());

		if (exists) {
			return {
				status: false,
				code: 400,
				message: RESPONSE_MESSAGES.KEY_ALREADY_EXISTS,
			};
		}

		const specialityDt = {
			name: payload.name.toLowerCase(),
			key: payload.key.toLowerCase(),
			isActive: payload.isActive ?? true,
		};

		const speciality = await Speciality.createSpeciality(specialityDt);

		return {
			status: true,
			code: 201,
			message: RESPONSE_MESSAGES.SPECIALITY_CREATED,
			data: speciality,
		};
	}

	// GET ALL
	static async getAllSpecialities(): Promise<ApiResponse> {
		const specialities = await Speciality.getActiveSpecialities();

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SPECIALITIES_RETRIEVED,
			data: specialities,
		};
	}

	// GET ONE
	static async getSpecialityById(id: number): Promise<ApiResponse> {
		const speciality = await Speciality.getSpecialityById(id);

		if (!speciality) {
			return {
				status: false,
				code: 404,
				message: RESPONSE_MESSAGES.SPECIALITY_NOT_FOUND,
			};
		}

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: speciality,
		};
	}

	// UPDATE
	static async updateSpeciality(id: number, updates: Partial<{ name: string; key: string; isActive: boolean }>): Promise<ApiResponse> {
		const speciality = await Speciality.getSpecialityById(id);

		if (!speciality) {
			return {
				status: false,
				code: 404,
				message: RESPONSE_MESSAGES.SPECIALITY_NOT_FOUND,
			};
		}

		// Prevent duplicate key
		if (updates.key) {
			const keyExists = await Speciality.getSpecialityByKey(updates.key.toLowerCase());

			if (keyExists && keyExists.id !== id) {
				return {
					status: false,
					code: 400,
					message: RESPONSE_MESSAGES.KEY_ALREADY_EXISTS,
				};
			}
		}

		await speciality.update({
			name: updates.name?.toLowerCase() ?? speciality.name,
			key: updates.key?.toLowerCase() ?? speciality.key,
			isActive: updates.isActive ?? speciality.isActive,
		});

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SPECIALITY_UPDATED,
			data: speciality,
		};
	}

	// DELETE
	static async deleteSpeciality(id: number): Promise<ApiResponse> {
		const speciality = await Speciality.getSpecialityById(id);

		if (!speciality) {
			return {
				status: false,
				code: 404,
				message: "Speciality not found",
			};
		}

		await speciality.destroy();

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SPECIALITY_DELETED,
		};
	}

	static async bulkCreateSpecialities(payload: Array<{ name: string; key: string; isActive: boolean }>): Promise<ApiResponse> {
		const normalized = payload.map((item) => ({
			...item,
			key: item.key.toLowerCase(),
		}));

		const keys = normalized.map((i) => i.key);

		const existing = await Speciality.findAll({
			where: { key: keys },
		});

		if (existing.length > 0) {
			const existingKeys = existing.map((e) => e.key);

			return {
				status: false,
				code: 409,
				message: "Duplicate keys found",
				data: {
					duplicates: existingKeys,
				},
			};
		}

		const created = await Speciality.bulkCreate(normalized);

		return {
			status: true,
			code: 201,
			message: "Specialities created successfully",
			data: created,
		};
	}
}
