import { Op } from "sequelize";
import AwsUtil_s3 from "../../utils/aws.s3";
import { ApiResponse } from "../../utils/common.dto";
import { DrugstorePrescription } from "./DrugstorePrescription.model";
import { SubmitPrescriptionDTO, ReviewPrescriptionDTO } from "./Drugstore.dto";
import { DrugstoreCart } from "./DrugstoreCart.model";

const response = (data: unknown, message = "Success", code = 200): ApiResponse => ({
	status: true,
	code,
	message,
	data,
});

export class DrugstorePrescriptionService {
	private static async uploadFile(userId: number, file: Express.Multer.File) {
		const uploader = new AwsUtil_s3();
		const extension = file.originalname.includes(".") ? file.originalname.split(".").pop() : "bin";
		const key = `drugstore/prescriptions/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
		return uploader.uploadBuffer(file.buffer, file.mimetype, key);
	}

	static async upload(userId: number, file?: Express.Multer.File): Promise<ApiResponse> {
		if (!file) {
			return { status: false, code: 400, message: "Prescription file is required" };
		}

		const uploaded = await this.uploadFile(userId, file);
		const prescription = await DrugstorePrescription.create({
			userId,
			merchantId: "00000000-0000-0000-0000-000000000000",
			fileUrl: uploaded.location,
			fileKey: uploaded.key,
			fileName: file.originalname,
			fileMimeType: file.mimetype,
			fileSize: file.size,
			status: "uploaded",
		});

		return response(prescription, "Prescription uploaded successfully", 201);
	}

	static async submit(userId: number, prescriptionId: string, payload: SubmitPrescriptionDTO): Promise<ApiResponse> {
		const prescription = await DrugstorePrescription.findOne({ where: { id: prescriptionId, userId } });
		if (!prescription) {
			return { status: false, code: 404, message: "Prescription not found" };
		}

		let cartId = payload.cartId || null;
		if (!cartId) {
			const activeCart = await DrugstoreCart.findOne({
				where: { userId, merchantId: payload.merchantId, status: { [Op.in]: ["active", "pending_checkout"] } },
				order: [["createdAt", "DESC"]],
			});
			cartId = activeCart?.id || null;
		}

		await prescription.update({
			merchantId: payload.merchantId,
			cartId,
			patientName: payload.patientName,
			prescriptionDate: payload.prescriptionDate,
			isForSelf: payload.isForSelf ?? true,
			status: "submitted",
			submittedAt: new Date(),
			merchantNote: null,
		});

		return response(prescription, "Prescription submitted successfully");
	}

	static async listForUser(userId: number, merchantId?: string): Promise<ApiResponse> {
		const where: Record<string, unknown> = { userId };
		if (merchantId) where.merchantId = merchantId;

		const prescriptions = await DrugstorePrescription.findAll({
			where,
			order: [["createdAt", "DESC"]],
		});

		return response(prescriptions);
	}

	static async getForUser(userId: number, prescriptionId: string): Promise<ApiResponse> {
		const prescription = await DrugstorePrescription.findOne({ where: { id: prescriptionId, userId } });
		if (!prescription) {
			return { status: false, code: 404, message: "Prescription not found" };
		}

		return response(prescription);
	}

	static async listForMerchant(merchantId: string, status?: string): Promise<ApiResponse> {
		const where: Record<string, unknown> = { merchantId };
		if (status) where.status = status;

		const prescriptions = await DrugstorePrescription.findAll({
			where,
			order: [["createdAt", "DESC"]],
		});

		return response(prescriptions);
	}

	static async reviewForMerchant(
		merchantId: string,
		prescriptionId: string,
		payload: ReviewPrescriptionDTO
	): Promise<ApiResponse> {
		const prescription = await DrugstorePrescription.findOne({ where: { id: prescriptionId, merchantId } });
		if (!prescription) {
			return { status: false, code: 404, message: "Prescription not found" };
		}

		await prescription.update({
			status: payload.action,
			merchantNote: payload.note || null,
			reviewedByMerchantId: payload.reviewerId || null,
			reviewedByMerchantName: payload.reviewerName || null,
			reviewedAt: new Date(),
		});

		return response(prescription, "Prescription reviewed successfully");
	}

	static async getApprovedForCart(userId: number, merchantId: string, cartId: string): Promise<DrugstorePrescription | null> {
		return DrugstorePrescription.findOne({
			where: { userId, merchantId, cartId, status: "approved" },
			order: [["reviewedAt", "DESC"]],
		});
	}
}
