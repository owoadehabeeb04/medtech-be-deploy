export type SortDirection = "asc" | "desc";

export interface GetCatalogProductsQueryDTO {
	page?: number;
	limit?: number;
	search?: string;
	category?: string;
	merchantId?: string;
	brand?: string | string[];
	priceMin?: number;
	priceMax?: number;
	sortBy?: "createdAt" | "price" | "name";
	sortDirection?: SortDirection;
}

export interface ValidateCatalogDiscountDTO {
	merchantId: string;
	code: string;
	orderAmount: number;
	productIds: string[];
}

export interface AddCartItemDTO {
	merchantId: string;
	merchantProductId: string;
	quantity: number;
}

export interface UpdateCartItemDTO {
	quantity: number;
}

export interface CreateOrderDTO {
	paymentMethod: "card" | "bank_transfer" | "wallet" | "pay_in_store";
	fulfillmentMethod?: "delivery" | "pickup";
	merchantId?: string;
	couponCode?: string;
	addressId?: string;
	deliveryNote?: string;
	deliveryDate?: string;
	deliveryTimeSlot?: string;
	returnUrl?: string;
	savedCardId?: string;
	saveCard?: boolean;
}

export interface ConfirmOrderPaymentDTO {
	paymentReference: string;
	providerStatus?: "paid" | "failed";
}

export interface CancelOrderDTO {
	reason?: string;
}

export interface ListOrderQueryDTO {
	page?: number;
	limit?: number;
	paymentStatus?: string[];
	deliveryStatus?: string[];
	dateRange?: "today" | "yesterday" | "last_7_days" | "last_30_days";
	ageBucket?: "lt_24h" | "between_24h_48h" | "gt_48h";
}

export interface NearbyPharmaciesQueryDTO {
	addressId?: string;
	latitude?: number;
	longitude?: number;
	search?: string;
	page?: number;
	limit?: number;
}

export interface UpsertDrugstoreAddressDTO {
	label?: string;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state: string;
	recipientName: string;
	recipientPhone: string;
	isDefault?: boolean;
	latitude?: number;
	longitude?: number;
}

export interface SubmitPrescriptionDTO {
	merchantId: string;
	cartId?: string;
	patientName: string;
	prescriptionDate: string;
	isForSelf?: boolean;
}

export interface ReviewPrescriptionDTO {
	action: "approved" | "rejected" | "needs_clarification";
	note?: string;
	reviewerName?: string;
	reviewerId?: string;
}
