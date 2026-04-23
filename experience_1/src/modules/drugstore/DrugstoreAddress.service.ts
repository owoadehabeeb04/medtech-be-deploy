import { ApiResponse } from "../../utils/common.dto";
import { DrugstoreAddress } from "./DrugstoreAddress.model";
import { UpsertDrugstoreAddressDTO } from "./Drugstore.dto";

const response = (data: unknown, message = "Success", code = 200): ApiResponse => ({
	status: true,
	code,
	message,
	data,
});

export class DrugstoreAddressService {
	static async list(userId: number): Promise<ApiResponse> {
		const addresses = await DrugstoreAddress.findAll({
			where: { userId },
			order: [
				["isDefault", "DESC"],
				["createdAt", "DESC"],
			],
		});

		return response(addresses);
	}

	static async create(userId: number, payload: UpsertDrugstoreAddressDTO): Promise<ApiResponse> {
		if (payload.isDefault) {
			await DrugstoreAddress.update({ isDefault: false }, { where: { userId } });
		}

		const existingCount = await DrugstoreAddress.count({ where: { userId } });
		const address = await DrugstoreAddress.create({
			userId,
			label: payload.label || "My Address",
			addressLine1: payload.addressLine1,
			addressLine2: payload.addressLine2 || null,
			city: payload.city,
			state: payload.state,
			recipientName: payload.recipientName,
			recipientPhone: payload.recipientPhone,
			isDefault: payload.isDefault ?? existingCount === 0,
			latitude: payload.latitude ?? null,
			longitude: payload.longitude ?? null,
		});

		return response(address, "Address created successfully", 201);
	}

	static async update(userId: number, addressId: string, payload: UpsertDrugstoreAddressDTO): Promise<ApiResponse> {
		const address = await DrugstoreAddress.findOne({ where: { id: addressId, userId } });
		if (!address) {
			return { status: false, code: 404, message: "Address not found" };
		}

		if (payload.isDefault) {
			await DrugstoreAddress.update({ isDefault: false }, { where: { userId } });
		}

		await address.update({
			label: payload.label ?? address.label,
			addressLine1: payload.addressLine1,
			addressLine2: payload.addressLine2 || null,
			city: payload.city,
			state: payload.state,
			recipientName: payload.recipientName,
			recipientPhone: payload.recipientPhone,
			isDefault: payload.isDefault ?? address.isDefault,
			latitude: payload.latitude ?? null,
			longitude: payload.longitude ?? null,
		});

		return response(address, "Address updated successfully");
	}

	static async remove(userId: number, addressId: string): Promise<ApiResponse> {
		const address = await DrugstoreAddress.findOne({ where: { id: addressId, userId } });
		if (!address) {
			return { status: false, code: 404, message: "Address not found" };
		}

		const wasDefault = address.isDefault;
		await address.destroy();

		if (wasDefault) {
			const replacement = await DrugstoreAddress.findOne({
				where: { userId },
				order: [["createdAt", "DESC"]],
			});
			if (replacement) {
				await replacement.update({ isDefault: true });
			}
		}

		return response({ id: addressId }, "Address deleted successfully");
	}

	static async getDefault(userId: number): Promise<DrugstoreAddress | null> {
		return DrugstoreAddress.findOne({
			where: { userId, isDefault: true },
			order: [["createdAt", "DESC"]],
		});
	}
}
