import express, { Application, Router} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import RouteGroup from "express-route-grouping";
const root = new RouteGroup("/", Router());

import healthRouter from "../modules/health/Health.route";
import specialityRouter from "../modules/speciality/Speciality.route";
import userTypeRouter from "../modules/user_types/UserType.route";
import userAuthRouter from "../modules/user_auth/UserAuth.route";
import permissionRouter from "../modules/permission/Permission.route";
import appoinmentRouter from "../modules/appointment/Appointment.route"
import consumerProfileRouter from "../modules/consumer_profile/ConsumerProfile.route";
import doctorProfileRouter from "../modules/doctor_profile/DoctorProfile.route";
import doctorSettingsRouter from "../modules/doctor_settings/DoctorSettings.route";
import doctorRatesRouter from "../modules/doctor_rates/DoctorRates.route";
import doctorHealthPackageRouter from "../modules/doctor_health_packages/DoctorHealthPackage.route";
import doctorReviewRouter from "../modules/doctor_reviews/DoctorReview.route";
import drugstoreRouter from "../modules/drugstore/Drugstore.route";

export default function (app: Application) {
	app.use(cors());
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	app.use(helmet());
	app.use(cookieParser());

	root.group("api/v1/main/", (router) => {
		router.use("/auth", userAuthRouter);
		router.use("/health", healthRouter);
		router.use("/specialities", specialityRouter);
		router.use("/user-types", userTypeRouter);
		router.use("/permissions", permissionRouter);
		router.use("/appointments", appoinmentRouter);
		router.use("/consumer", consumerProfileRouter);
		router.use("/doctor", doctorProfileRouter);
		router.use("/doctor", doctorSettingsRouter);
		router.use("/doctor", doctorRatesRouter);
		router.use("/doctor", doctorHealthPackageRouter);
		router.use("/doctor", doctorReviewRouter);
		router.use("/drugstore", drugstoreRouter);
	});

	app.use(root.export());
}
