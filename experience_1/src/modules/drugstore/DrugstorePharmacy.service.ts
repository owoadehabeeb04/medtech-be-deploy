import { ApiResponse } from "../../utils/common.dto";
import { DrugstoreMerchantClient } from "./DrugstoreMerchantClient";
import { DrugstoreAddressService } from "./DrugstoreAddress.service";
import { NearbyPharmaciesQueryDTO } from "./Drugstore.dto";
import { DrugstoreCart } from "./DrugstoreCart.model";
import { DrugstoreCartItem } from "./DrugstoreCartItem.model";

const pharmaciesNearbyPath = "/api/v1/merchant/internal/drugstore/nearby-pharmacies";
const pharmacyProfilePath = "/api/v1/merchant/internal/drugstore/pharmacies";

const response = (data: unknown, message = "Success", code = 200): ApiResponse => ({
	status: true,
	code,
	message,
	data,
});

export class DrugstorePharmacyService {
	// A caller can hold one active cart per pharmacy simultaneously, so every one of them needs its
	// own summary here — not just "the" active cart — to enrich each matching row in the nearby list.
	private static async getActiveCartSummaries(userId: number) {
		const carts = await DrugstoreCart.findAll({
			where: { userId, status: "active" },
			include: [{ model: DrugstoreCartItem, as: "items" }],
			order: [["createdAt", "DESC"]],
		});

		return carts.map((cart) => ({
			merchantId: cart.merchantId,
			itemCount: (cart.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
			subtotal: Number(cart.grandTotal || 0),
			productIds: (cart.items || []).map((item) => item.merchantProductId),
		}));
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

		const cartSummaries = await this.getActiveCartSummaries(userId);
		const data = await DrugstoreMerchantClient.get(pharmaciesNearbyPath, {
			addressId,
			latitude,
			longitude,
			search: query.search,
			page: query.page,
			limit: query.limit,
			// JSON-encoded since DrugstoreMerchantClient.get only carries flat string/number/boolean
			// query values — this is the one field here that's genuinely list-shaped.
			activeCarts: cartSummaries.length > 0 ? JSON.stringify(cartSummaries) : undefined,
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
