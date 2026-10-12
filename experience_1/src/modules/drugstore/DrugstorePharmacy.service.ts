import { ApiResponse } from "../../utils/common.dto";
import { DrugstoreMerchantClient } from "./DrugstoreMerchantClient";
import { DrugstoreAddressService } from "./DrugstoreAddress.service";
import { NearbyPharmaciesQueryDTO, CreatePharmacyReviewDTO } from "./Drugstore.dto";
import { DrugstoreOrder } from "./DrugstoreOrder.model";
import { User } from "../users/User.model";
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
		let latitude: number | undefined;
		let longitude: number | undefined;
		let addressId = query.addressId;

		// A coordinate pair only counts if it's real: 0,0 (and null/NaN) is what an address saved
		// without a location looks like, and would otherwise search the Gulf of Guinea.
		const useCoordinates = (lat: unknown, lng: unknown) => {
			if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
			const parsedLat = Number(lat);
			const parsedLng = Number(lng);
			if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return false;
			if (parsedLat === 0 && parsedLng === 0) return false;
			latitude = parsedLat;
			longitude = parsedLng;
			return true;
		};

		if (!useCoordinates(query.latitude, query.longitude) && addressId) {
			const addresses = await DrugstoreAddressService.list(userId);
			const selected = Array.isArray(addresses.data)
				? (addresses.data as any[]).find((entry) => entry.id === addressId)
				: null;
			if (selected) useCoordinates(selected.latitude, selected.longitude);
		}

		if (latitude === undefined && !addressId) {
			const defaultAddress = await DrugstoreAddressService.getDefault(userId);
			if (defaultAddress) {
				addressId = defaultAddress.id;
				useCoordinates(defaultAddress.latitude, defaultAddress.longitude);
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

	// Consumers review a pharmacy once per order, and only after that order was delivered.
	static async createPharmacyReview(userId: number, merchantId: string, payload: CreatePharmacyReviewDTO): Promise<ApiResponse> {
		const order = await DrugstoreOrder.findOne({ where: { id: payload.orderId, userId, merchantId } });
		if (!order) {
			return { status: false, code: 404, message: "Order not found for this pharmacy" };
		}
		if (order.deliveryStatus !== "delivered") {
			return { status: false, code: 400, message: "You can review a pharmacy once your order has been delivered" };
		}

		const user = await User.findByPk(userId);
		const consumerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Customer";

		const data = await DrugstoreMerchantClient.post(`${pharmacyProfilePath}/${merchantId}/reviews`, {
			orderId: order.id,
			consumerId: String(userId),
			consumerName,
			rating: payload.rating,
			comment: payload.comment || null,
		});

		return response(data, "Review submitted successfully", 201);
	}
}
