import { Dialect } from "sequelize";
import * as dotenv from "dotenv";
import * as path from "path";
import { Sequelize } from "sequelize-typescript";
import { User } from "../modules/users/User.model";
import { UserAuth } from "../modules/user_auth/UserAuth.model";
import { UserType } from "../modules/user_types/UserType.model";
import { UserToken } from "../modules/user_token/UserToken.model";
import { UserVerification } from "../modules/user_verification/UserVerification.model";
import { UserProfile } from "../modules/user_profile/UserProfile.model";
import { DoctorProfile } from "../modules/doctor_profile/DoctorProfile.model";
import { EducationalHistory } from "../modules/educational_history/EducationalHistory.model";
import { WorkHistory } from "../modules/work_history/WorkHistory.model";
import { Permission } from "../modules/permission/Permission.model";
import { UserTypePermission } from "../modules/user_type_permission/UserTypePermission.model";
import { Speciality } from "../modules/speciality/Speciality.model";
import { UserSpeciality } from "../modules/user_specialities/UserSpecialities.model";
import { Appointment } from "../modules/appointment/Appointment.model";
import { ConsultationType } from "../modules/consultation_type/ConsultationType.model";
import { DoctorSettings } from "../modules/doctor_settings/DoctorSettings.model";
import { DoctorDeviceToken } from "../modules/doctor_settings/DoctorDeviceToken.model";
import { DoctorConsultationRate } from "../modules/doctor_rates/DoctorConsultationRate.model";
import { DoctorSubscriptionPlan } from "../modules/doctor_rates/DoctorSubscriptionPlan.model";
import { DoctorHealthPackage } from "../modules/doctor_health_packages/DoctorHealthPackage.model";
import { DoctorReview } from "../modules/doctor_reviews/DoctorReview.model";
import { DoctorReviewReply } from "../modules/doctor_reviews/DoctorReviewReply.model";
import { DoctorReviewStat } from "../modules/doctor_reviews/DoctorReviewStat.model";
import { DrugstoreCart } from "../modules/drugstore/DrugstoreCart.model";
import { DrugstoreCartItem } from "../modules/drugstore/DrugstoreCartItem.model";
import { DrugstoreOrder } from "../modules/drugstore/DrugstoreOrder.model";
import { DrugstoreOrderItem } from "../modules/drugstore/DrugstoreOrderItem.model";
import { DrugstoreOrderStatusHistory } from "../modules/drugstore/DrugstoreOrderStatusHistory.model";
import { DrugstoreSyncEvent } from "../modules/drugstore/DrugstoreSyncEvent.model";
import { DrugstoreAddress } from "../modules/drugstore/DrugstoreAddress.model";
import { DrugstorePrescription } from "../modules/drugstore/DrugstorePrescription.model";
import { DrugstoreWallet } from "../modules/drugstore/DrugstoreWallet.model";
import { DrugstoreWalletTransaction } from "../modules/drugstore/DrugstoreWalletTransaction.model";
import { DrugstoreSavedCard } from "../modules/drugstore/DrugstoreSavedCard.model";
import { DrugstoreCategoryGroup } from "../modules/drugstore/DrugstoreCategoryGroup.model";
import { ensureSpecialitySeedData } from "../modules/speciality/Speciality.seed";
import { ensureDrugstoreCategoryGroupSeedData } from "../modules/drugstore/DrugstoreCategoryGroup.seed";
import { applicationConfig } from "../config";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connection = async () => {
	const user_mod = [User, UserAuth, UserType, UserToken, UserVerification];
	const extra_user_mod = [UserProfile, DoctorProfile, EducationalHistory, WorkHistory];
	const permission_mod = [Permission, UserTypePermission];
	const medic_mod = [Speciality, UserSpeciality, Appointment, ConsultationType];
	const doctor_settings_mod = [DoctorSettings, DoctorDeviceToken, DoctorConsultationRate, DoctorSubscriptionPlan, DoctorHealthPackage];
	const doctor_reviews_mod = [DoctorReview, DoctorReviewReply, DoctorReviewStat];
	const drugstore_mod = [
		DrugstoreCart,
		DrugstoreCartItem,
		DrugstoreOrder,
		DrugstoreOrderItem,
		DrugstoreOrderStatusHistory,
		DrugstoreSyncEvent,
		DrugstoreAddress,
		DrugstorePrescription,
		DrugstoreWallet,
		DrugstoreWalletTransaction,
		DrugstoreSavedCard,
		DrugstoreCategoryGroup,
	];
	const models = [...user_mod, ...extra_user_mod, ...permission_mod, ...medic_mod, ...doctor_settings_mod, ...doctor_reviews_mod, ...drugstore_mod];
	const dbHost = process.env.EXPERIENCE1_DB_HOST || process.env.DB_HOST;
	const dbPort = Number(process.env.EXPERIENCE1_DB_PORT || process.env.DB_PORT || 5432);
	const dbUsername = process.env.EXPERIENCE1_DB_USERNAME || process.env.DB_USERNAME;
	const dbPassword = process.env.EXPERIENCE1_DB_PASSWORD || process.env.DB_PASSWORD;
	const dbName = process.env.EXPERIENCE1_DB_NAME || process.env.DB_NAME;

	const dialectOptions = applicationConfig.db.sslEnabled
		? {
				ssl: {
					require: true,
					rejectUnauthorized: applicationConfig.db.rejectUnauthorized,
				},
		  }
		: undefined;

	const sequelize = new Sequelize({
		dialect: "postgres" as Dialect,
		host: dbHost,
		port: dbPort,
		username: dbUsername,
		password: dbPassword,
		database: dbName,
		logging: false,
		dialectOptions,
		define: {
			underscored: true,
		},
		models: [...models],
	});

	try {
		await sequelize.authenticate();
		if ((process.env.APP_ENV || process.env.NODE_ENV) !== "production" || process.env.FORCE_SYNC === "true") {
			await sequelize.sync({ alter: true });
		}
		await ensureSpecialitySeedData();
		await ensureDrugstoreCategoryGroupSeedData();
		console.log("Connection has been established successfully.");
	} catch (error) {
		console.error("Unable to connect to the database:", error);
		process.exit(1);
	}
	return sequelize;
};
export default connection;
