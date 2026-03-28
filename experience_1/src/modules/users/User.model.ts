import { AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, HasMany, HasOne, Model, Table, Unique } from "sequelize-typescript";
import { UserType } from "../user_types/UserType.model";
import { USER_STATUS } from "../../constants/constant";
import { UserProfile } from "../user_profile/UserProfile.model";
import { EducationalHistory } from "../educational_history/EducationalHistory.model";
import { WorkHistory } from "../work_history/WorkHistory.model";
import { CreateUserDTO } from "./User.dto";
import { Permission } from "../permission/Permission.model";
import { DoctorProfile } from "../doctor_profile/DoctorProfile.model";
import { UserSpeciality } from "../user_specialities/UserSpecialities.model";

@Table({
	tableName: "users",
	timestamps: true,
})
export class User extends Model<User> {
	@Column(DataType.STRING)
	declare firstName: string;

	@Column(DataType.STRING)
	declare lastName: string;

	@Unique(true)
	@Column(DataType.STRING)
	declare userName: string;

	@Column(DataType.STRING)
	declare phoneNumber: string;

	@Unique(true)
	@Column(DataType.STRING)
	declare email: string;

	@Column(DataType.DATE)
	declare dob: Date;

	@Column(DataType.STRING)
	declare profilePicture: string;

	@Column(DataType.STRING)
	declare verificationNumber: string;

	@Column(DataType.STRING)
	declare medicalLicenseNumber: string;

	@Default(USER_STATUS.ACTIVE)
	@Column(DataType.ENUM(...Object.values(USER_STATUS)))
	declare status: USER_STATUS;

	@Column(DataType.BOOLEAN)
	declare tnc: boolean;

	@Default(false)
	@Column(DataType.BOOLEAN)
	declare isProfileComplete: boolean;

	@Default(true)
	@Column(DataType.BOOLEAN)
	declare isActive: boolean;

	@ForeignKey(() => UserType)
	@AllowNull(true)
	@Column(DataType.STRING)
	declare userType: string;
	@BelongsTo(() => UserType, { foreignKey: "userType", targetKey: "key", onDelete: "SET NULL" })
	declare userTypeData: UserType;

	@HasOne(() => UserProfile)
	declare userProfile: UserProfile;

	@HasOne(() => DoctorProfile)
	declare doctorProfile: DoctorProfile;

	@HasMany(() => EducationalHistory)
	declare educationalHistories: EducationalHistory[];

	@HasMany(() => WorkHistory)
	declare workHistories: WorkHistory[];

	@HasMany(() => UserSpeciality)
	declare userSpecialities: UserSpeciality[];

	static async findByEmail(email: string, userType?: string | string[]): Promise<User | null> {
		const where: Record<string, any> = { email };
		if (userType) {
			where.userType = userType;
		}

		return await this.findOne({
			where,
			include: [
				{ model: UserType, as: "userTypeData", include: [{ model: Permission, as: "permissions", attributes: ["key"] }] },
				{ model: UserProfile, as: "userProfile" },
				{ model: DoctorProfile, as: "doctorProfile" },
				{ model: EducationalHistory, as: "educationalHistories" },
				{ model: WorkHistory, as: "workHistories" },
				{ model: UserSpeciality, as: "userSpecialities" },
			],
		});
	}

	static async findById(id: number): Promise<User | null> {
		return await User.findByPk(id, {
			include: [
				{ model: UserType, as: "userTypeData", include: [{ model: Permission, as: "permissions", attributes: ["key"] }] },
				{ model: UserProfile, as: "userProfile" },
				{ model: DoctorProfile, as: "doctorProfile" },
				{ model: EducationalHistory, as: "educationalHistories" },
				{ model: WorkHistory, as: "workHistories" },
				{ model: UserSpeciality, as: "userSpecialities" },
			],
		});
	}

	static async createUser(data: CreateUserDTO): Promise<User> {
		return await User.create({
			firstName: data.firstName.toLowerCase(),
			lastName: data.lastName.toLowerCase(),
			email: data.email,
			tnc: data?.tnc,
			verificationNumber: data?.verificationNumber,
			medicalLicenseNumber: data?.medicalLicenseNumber,
			phoneNumber: data?.phoneNumber,
			userType: data?.userType,
		});
	}

	static async findByUsername(username: string): Promise<User | null> {
		return await this.findOne({
			where: { userName: username },
		});
	}

}
