import { Sequelize } from "sequelize";
import { ApiResponse } from "../../utils/common.dto";
import { koboToNgn, ngnToKobo } from "../../utils/money";
import { DoctorHealthPackage } from "../doctor_health_packages/DoctorHealthPackage.model";
import { DoctorConsultationRate } from "./DoctorConsultationRate.model";
import { DoctorSubscriptionPlan } from "./DoctorSubscriptionPlan.model";
import { ReplaceDoctorSubscriptionPlansDTO, UpsertDoctorConsultationRateDTO } from "./DoctorRates.dto";

const serializeConsultationRate = (consultationRate?: DoctorConsultationRate | null) =>
	consultationRate
		? {
				id: consultationRate.id,
				amountKobo: consultationRate.amountKobo,
				amountNgn: koboToNgn(consultationRate.amountKobo),
				durationMinutes: consultationRate.durationMinutes,
				isActive: consultationRate.isActive,
				updatedAt: consultationRate.updatedAt,
		  }
		: null;

const serializeSubscriptionPlan = (plan: DoctorSubscriptionPlan) => ({
	id: plan.id,
	title: plan.title,
	amountKobo: plan.amountKobo,
	amountNgn: koboToNgn(plan.amountKobo),
	durationDays: plan.durationDays,
	sortOrder: plan.sortOrder,
	isActive: plan.isActive,
	createdAt: plan.createdAt,
	updatedAt: plan.updatedAt,
});

export class DoctorRatesService {
	static async getRates(doctorId: number): Promise<ApiResponse> {
		const [consultationRate, subscriptionPlans, healthPackagesPreviewCount] = await Promise.all([
			DoctorConsultationRate.findOne({ where: { doctorId, isActive: true } }),
			DoctorSubscriptionPlan.findAll({
				where: { doctorId, isActive: true },
				order: [
					["sortOrder", "ASC"],
					["createdAt", "ASC"],
				],
			}),
			DoctorHealthPackage.count({
				where: {
					doctorId,
					isActive: true,
					deletedAt: null,
				},
			}),
		]);

		return {
			status: true,
			code: 200,
			message: "Doctor rates retrieved successfully",
			data: {
				consultationRate: serializeConsultationRate(consultationRate),
				subscriptionPlans: subscriptionPlans.map(serializeSubscriptionPlan),
				healthPackagesPreviewCount,
			},
		};
	}

	static async upsertConsultationRate(doctorId: number, data: UpsertDoctorConsultationRateDTO): Promise<ApiResponse> {
		const values = {
			amountKobo: ngnToKobo(data.amountNgn),
			durationMinutes: data.durationMinutes,
			isActive: true,
		};

		const existing = await DoctorConsultationRate.findOne({ where: { doctorId } });
		const consultationRate = existing
			? await existing.update(values)
			: await DoctorConsultationRate.create({
					doctorId,
					...values,
			  });

		return {
			status: true,
			code: 200,
			message: "Doctor consultation rate saved successfully",
			data: {
				consultationRate: serializeConsultationRate(consultationRate),
			},
		};
	}

	static async replaceSubscriptionPlans(
		doctorId: number,
		data: ReplaceDoctorSubscriptionPlansDTO,
		sequelize: Sequelize
	): Promise<ApiResponse> {
		const plans = await sequelize.transaction(async (transaction) => {
			await DoctorSubscriptionPlan.update(
				{ isActive: false },
				{
					where: { doctorId, isActive: true },
					transaction,
				}
			);

			return DoctorSubscriptionPlan.bulkCreate(
				data.plans.map((plan, index) => ({
					doctorId,
					title: plan.title.trim(),
					amountKobo: ngnToKobo(plan.amountNgn),
					durationDays: plan.durationDays,
					sortOrder: plan.sortOrder ?? index,
					isActive: true,
				})),
				{ transaction }
			);
		});

		return {
			status: true,
			code: 200,
			message: "Doctor subscription plans saved successfully",
			data: {
				subscriptionPlans: plans.map(serializeSubscriptionPlan),
			},
		};
	}
}
