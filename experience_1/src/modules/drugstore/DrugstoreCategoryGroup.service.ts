import { RESPONSE_MESSAGES } from "../../constants/response";
import { ApiResponse } from "../../utils/common.dto";
import { DrugstoreMerchantClient } from "./DrugstoreMerchantClient";

type CategoryQuery = {
	parentId?: string;
	search?: string;
	includeChildren?: boolean;
};

type ProductCategoryNode = {
	id: string;
	key: string;
	name: string;
	parentId: string | null;
	sortOrder: number;
	isActive: boolean;
	isSelectable: boolean;
	childCount: number;
	breadcrumb: Array<{ id: string; key: string; name: string }>;
	children?: ProductCategoryNode[];
};

export class DrugstoreCategoryGroupService {
	private static categoryPath = "/api/v1/merchant/internal/drugstore/categories";

	static async listGroups(query: CategoryQuery = {}): Promise<ApiResponse> {
		const groups = await DrugstoreMerchantClient.get<ProductCategoryNode[]>(this.categoryPath, query);

		return { status: true, code: 200, message: RESPONSE_MESSAGES.SUCCESSS, data: groups };
	}

	static async getGroupBySlug(slug: string): Promise<ApiResponse> {
		const groups = await DrugstoreMerchantClient.get<ProductCategoryNode[]>(this.categoryPath, { search: slug });
		const group = groups.find((item) => item.key === slug || item.name.toLowerCase() === slug.toLowerCase());
		if (!group) return { status: false, code: 404, message: "Category group not found" };

		return { status: true, code: 200, message: RESPONSE_MESSAGES.SUCCESSS, data: group };
	}
}
