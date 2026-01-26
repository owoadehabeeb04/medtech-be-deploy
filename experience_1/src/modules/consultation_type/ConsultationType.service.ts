// import { RESPONSE_MESSAGES } from "../../constants/response";
// import { ApiResponse } from "../../utils/common.dto";
// import { ConsultationType } from "./ConsultationType.model";

// export class ConsultationTypeService {
// 	static async getAllConsultationTypes(): Promise<ApiResponse> {
// 		const consultationTypes = await ConsultationType.getAllConsultationTypes();

// 		return {
// 			status: true,
// 			code: 200,
// 			data: consultationTypes,
// 			message: RESPONSE_MESSAGES.CONSULTATION_TYPES_RETRIEVED,
// 		};
// 	}

// 	static async createConsultationType(name: string, key: string): Promise<ApiResponse> {
// 		const newConsultationType = await ConsultationType.create({
// 			name,
// 			key,
// 			isActive: true,
// 		});
// 		return {
// 			status: true,
// 			code: 201,
// 			message: RESPONSE_MESSAGES.CONSULTATION_TYPE_CREATED,
// 			data: newConsultationType,
// 		};
// 	}

// 	static async deactivateConsultationType(id: number): Promise<ApiResponse> {
// 		const consultationType = await ConsultationType.findByPk(id);
// 		if (!consultationType) {
// 			return {
// 				status: false,
// 				code: 404,
// 				message: RESPONSE_MESSAGES.NOT_FOUND,
// 			};
// 		}

// 		consultationType.isActive = false;
// 		await consultationType.save();

// 		return {
// 			status: true,
// 			code: 200,
// 			message: RESPONSE_MESSAGES.CONSULTATION_TYPE_DEACTIVATED,
// 			data: consultationType,
// 		};
// 	}
// 	static async bulkCreateConsultationTypes(types: { name: string; key: string }[]): Promise<ApiResponse> {
// 		const newConsultationTypes = await ConsultationType.bulkCreate(
// 			types.map((type) => ({
// 				name: type.name,
// 				key: type.key.toLowerCase().trim(),
// 				isActive: true,
// 			}))
// 		);

// 		return {
// 			status: true,
// 			code: 201,
// 			message: RESPONSE_MESSAGES.CONSULTATION_TYPE_CREATED,
// 			data: newConsultationTypes,
// 		};
// 	}
// }
