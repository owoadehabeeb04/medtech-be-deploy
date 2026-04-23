import { ApiResponse } from "../../utils/common.dto";
import { DrugstoreMerchantClient } from "./DrugstoreMerchantClient";
import { DrugstoreAddressService } from "./DrugstoreAddress.service";
import { NearbyPharmaciesQueryDTO } from "./Drugstore.dto";
import { DrugstoreCart } from "./DrugstoreCart.model";
import { DrugstoreCartItem } from "./DrugstoreCartItem.model";

const pharmaciesNearbyPath = "/api/v1/merchant/internal/drugstore/pharmacies/nearby";
const pharmacyProfilePath = "/api/v1/merchant/internal/drugstore/pharmacies";

const response = (data: unknown, message = "Success", code = 200): ApiResponse => ({
	status: true,
	code,
	message,
	data,
});

export class DrugstorePharmacyService {
	private static async getActiveCartSummary(userId: number) {
		const cart = await DrugstoreCart.findOne({
			where: { userId, status: "active" },
			include: [{ model: DrugstoreCartItem, as: "items" }],
			order: [["createdAt", "DESC"]],
		});

		if (!cart) return null;

		return {
			merchantId: cart.merchantId,
			itemCount: (cart.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
			subtotal: Number(cart.grandTotal || 0),
			productIds: (cart.items || []).map((item) => item.merchantProductId),
		};
	}

	static async listNearbyPharmacies(userId: number, query: NearbyPharmaciesQueryDTO): Promise<ApiResponse> {
		let latitude = query.latitude;
		let longitude = query.longitude;
		let addressId = query.addressId;

		if ((!latitude || !longitude) && addressId) {
			const addresses = await DrugstoreAddressService.list(userId);
			const selected = Array.isArray(addresses.data)
				? (addresses.data as any[]).find((entry) => entry.id === addressId)
				: null;
			if (selected) {
				latitude = selected.latitude || undefined;
				longitude = selected.longitude || undefined;
			}
		}

		if ((!latitude || !longitude) && !addressId) {
			const defaultAddress = await DrugstoreAddressService.getDefault(userId);
			if (defaultAddress) {
				addressId = defaultAddress.id;
				latitude = Number(defaultAddress.latitude || 0) || undefined;
				longitude = Number(defaultAddress.longitude || 0) || undefined;
			}
		}

		const cartSummary = await this.getActiveCartSummary(userId);
		const data = await DrugstoreMerchantClient.get(pharmaciesNearbyPath, {
			addressId,
			latitude,
			longitude,
			search: query.search,
			page: query.page,
			limit: query.limit,
			activeCartMerchantId: cartSummary?.merchantId,
			activeCartItemCount: cartSummary?.itemCount,
			activeCartSubtotal: cartSummary?.subtotal,
		});

		return response(data);
	}

	static async getPharmacyProfile(merchantId: string): Promise<ApiResponse> {
		const data = await DrugstoreMerchantClient.get(`${pharmacyProfilePath}/${merchantId}`);
		return response(data);
	}

	static async getPharmacyReviews(merchantId: string, page?: number, limit?: number): Promise<ApiResponse> {
		const data = await DrugstoreMerchantClient.get(`${pharmacyProfilePath}/${merchantId}/reviews`, { page, limit });
		return response(data);
	}
}
