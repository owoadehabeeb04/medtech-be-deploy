import { Dialect } from "sequelize";
import * as dotenv from "dotenv";
import { Sequelize } from "sequelize-typescript";
import { User } from "../modules/users/User.model";
import { UserAuth } from "../modules/user_auth/UserAuth.model";
import { UserType } from "../modules/user_types/UserType.model";
import { UserToken } from "../modules/user_token/UserToken.model";
import { UserVerification } from "../modules/user_verification/UserVerification.model";
import { UserProfile } from "../modules/user_profile/UserProfile.model";
import { EducationalHistory } from "../modules/educational_history/EducationalHistory.model";
import { WorkHistory } from "../modules/work_history/WorkHistory.model";
import { Permission } from "../modules/permission/Permission.model";
import { UserTypePermission } from "../modules/user_type_permission/UserTypePermission.model";
import { Speciality } from "../modules/speciality/Speciality.model";
import { UserSpeciality } from "../modules/user_specialities/UserSpecialities.model";
import { Appointment } from "../modules/appointment/Appointment.model";
import { ConsultationType } from "../modules/consultation_type/ConsultationType.model";
dotenv.config();

const connection = async () => {
	const user_mod = [User, UserAuth, UserType, UserToken, UserVerification];
	const extra_user_mod = [UserProfile, EducationalHistory, WorkHistory];
	const permission_mod = [Permission, UserTypePermission];
	const medic_mod = [Speciality, UserSpeciality, Appointment, ConsultationType];
	const models = [...user_mod, ...extra_user_mod, ...permission_mod, ...medic_mod];

	const sequelize = new Sequelize({
		dialect: "postgres" as Dialect,
		host: process.env.DB_HOST,
		username: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		logging: false,
		dialectOptions: {
			ssl: {
				require: true,
				rejectUnauthorized: false,
			},
		},
		define: {
			underscored: true,
		},
		models: [...models],
	});

	try {
		await sequelize.authenticate();
		// await sequelize.sync({ alter: true });
		console.log("Connection has been established successfully.");
	} catch (error) {
		console.error("Unable to connect to the database:", error);
		process.exit(1);
	}
	return sequelize;
};
export default connection;
