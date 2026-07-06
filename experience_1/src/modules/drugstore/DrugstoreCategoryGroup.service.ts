import { RESPONSE_MESSAGES } from "../../constants/response";
import { ApiResponse } from "../../utils/common.dto";
import { DrugstoreCategoryGroup } from "./DrugstoreCategoryGroup.model";

export class DrugstoreCategoryGroupService {
	static async listGroups(): Promise<ApiResponse> {
		const groups = await DrugstoreCategoryGroup.findAll({
			where: { isActive: true },
			order: [["sortOrder", "ASC"]],
		});

		return { status: true, code: 200, message: RESPONSE_MESSAGES.SUCCESSS, data: groups };
	}

	static async getGroupBySlug(slug: string): Promise<ApiResponse> {
		const group = await DrugstoreCategoryGroup.findOne({ where: { slug, isActive: true } });
		if (!group) return { status: false, code: 404, message: "Category group not found" };

		return { status: true, code: 200, message: RESPONSE_MESSAGES.SUCCESSS, data: group };
	}
}
