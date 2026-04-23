import AwsUtil_s3 from "../../utils/aws.s3";
import { genAlphaNum } from "../../utils";
import { ApiResponse } from "../../utils/common.dto";
import { koboToNgn, ngnToKobo } from "../../utils/money";
import { DoctorHealthPackage } from "./DoctorHealthPackage.model";
import { UpsertDoctorHealthPackageDTO } from "./DoctorHealthPackage.dto";

type DoctorHealthPackageFiles = {
	coverImage?: Express.Multer.File;
	attachment?: Express.Multer.File;
};

const serializeListItem = (doctorHealthPackage: DoctorHealthPackage) => ({
	id: doctorHealthPackage.id,
	title: doctorHealthPackage.title,
	priceKobo: doctorHealthPackage.priceKobo,
	priceNgn: koboToNgn(doctorHealthPackage.priceKobo),
	coverImageUrl: doctorHealthPackage.coverImageUrl,
	soldCount: doctorHealthPackage.soldCount,
	createdAt: doctorHealthPackage.createdAt,
});

const serializeDetail = (doctorHealthPackage: DoctorHealthPackage) => ({
	id: doctorHealthPackage.id,
	title: doctorHealthPackage.title,
	priceKobo: doctorHealthPackage.priceKobo,
	priceNgn: koboToNgn(doctorHealthPackage.priceKobo),
	description: doctorHealthPackage.description,
	coverImageUrl: doctorHealthPackage.coverImageUrl,
	attachmentUrl: doctorHealthPackage.attachmentUrl,
	soldCount: doctorHealthPackage.soldCount,
	createdAt: doctorHealthPackage.createdAt,
	updatedAt: doctorHealthPackage.updatedAt,
});

export class DoctorHealthPackageService {
	private static async uploadFile(doctorId: number, category: "cover-images" | "attachments", file: Express.Multer.File) {
		const ext = file.originalname.includes(".") ? file.originalname.split(".").pop() : "bin";
		const key = `doctor-health-packages/${doctorId}/${category}/${Date.now()}-${genAlphaNum(8)}.${ext}`;
		const uploader = new AwsUtil_s3();
		return uploader.uploadBuffer(file.buffer, file.mimetype, key);
	}

	private static async uploadFiles(doctorId: number, files: DoctorHealthPackageFiles) {
		const result: { coverImageUrl?: string; attachmentUrl?: string } = {};

		if (files.coverImage) {
			const upload = await this.uploadFile(doctorId, "cover-images", files.coverImage);
			result.coverImageUrl = upload.location;
		}

		if (files.attachment) {
			const upload = await this.uploadFile(doctorId, "attachments", files.attachment);
			result.attachmentUrl = upload.location;
		}

		return result;
	}

	private static async getActivePackage(doctorId: number, packageId: number): Promise<DoctorHealthPackage | null> {
		return DoctorHealthPackage.findOne({
			where: {
				id: packageId,
				doctorId,
				isActive: true,
				deletedAt: null,
			},
		});
	}

	static async listPackages(doctorId: number): Promise<ApiResponse> {
		const packages = await DoctorHealthPackage.findAll({
			where: {
				doctorId,
				isActive: true,
				deletedAt: null,
			},
			order: [["createdAt", "DESC"]],
		});

		return {
			status: true,
			code: 200,
			message: "Doctor health packages retrieved successfully",
			data: {
				packages: packages.map(serializeListItem),
			},
		};
	}

	static async getPackageDetails(doctorId: number, packageId: number): Promise<ApiResponse> {
		const doctorHealthPackage = await this.getActivePackage(doctorId, packageId);
		if (!doctorHealthPackage) {
			return {
				status: false,
				code: 404,
				message: "Doctor health package not found",
			};
		}

		return {
			status: true,
			code: 200,
			message: "Doctor health package retrieved successfully",
			data: {
				package: serializeDetail(doctorHealthPackage),
			},
		};
	}

	static async createPackage(
		doctorId: number,
		data: UpsertDoctorHealthPackageDTO,
		files: DoctorHealthPackageFiles
	): Promise<ApiResponse> {
		const uploaded = await this.uploadFiles(doctorId, files);

		const doctorHealthPackage = await DoctorHealthPackage.create({
			doctorId,
			title: data.title!.trim(),
			priceKobo: ngnToKobo(data.priceNgn!),
			description: data.description!.trim(),
			coverImageUrl: uploaded.coverImageUrl || null,
			attachmentUrl: uploaded.attachmentUrl || null,
			isActive: true,
		});

		return {
			status: true,
			code: 201,
			message: "Doctor health package created successfully",
			data: {
				package: serializeDetail(doctorHealthPackage),
			},
		};
	}

	static async updatePackage(
		doctorId: number,
		packageId: number,
		data: UpsertDoctorHealthPackageDTO,
		files: DoctorHealthPackageFiles
	): Promise<ApiResponse> {
		const doctorHealthPackage = await this.getActivePackage(doctorId, packageId);
		if (!doctorHealthPackage) {
			return {
				status: false,
				code: 404,
				message: "Doctor health package not found",
			};
		}

		const uploaded = await this.uploadFiles(doctorId, files);

		await doctorHealthPackage.update({
			title: data.title?.trim() ?? doctorHealthPackage.title,
			priceKobo: data.priceNgn !== undefined ? ngnToKobo(data.priceNgn) : doctorHealthPackage.priceKobo,
			description: data.description?.trim() ?? doctorHealthPackage.description,
			coverImageUrl: uploaded.coverImageUrl ?? doctorHealthPackage.coverImageUrl,
			attachmentUrl: uploaded.attachmentUrl ?? doctorHealthPackage.attachmentUrl,
		});

		return {
			status: true,
			code: 200,
			message: "Doctor health package updated successfully",
			data: {
				package: serializeDetail(doctorHealthPackage),
			},
		};
	}

	static async deletePackage(doctorId: number, packageId: number): Promise<ApiResponse> {
		const doctorHealthPackage = await this.getActivePackage(doctorId, packageId);
		if (!doctorHealthPackage) {
			return {
				status: false,
				code: 404,
				message: "Doctor health package not found",
			};
		}

		await doctorHealthPackage.update({
			isActive: false,
			deletedAt: new Date(),
		});

		return {
			status: true,
			code: 200,
			message: "Doctor health package deleted successfully",
		};
	}
}
