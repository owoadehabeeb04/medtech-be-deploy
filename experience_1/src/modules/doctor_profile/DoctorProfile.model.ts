import { BelongsTo, Column, DataType, Default, ForeignKey, Model, Table } from "sequelize-typescript";
import { User } from "../users/User.model";

@Table({ tableName: "doctor_profiles", timestamps: true })
export class DoctorProfile extends Model<DoctorProfile> {
	@ForeignKey(() => User)
	@Column(DataType.INTEGER)
	declare userId: number;

	@BelongsTo(() => User)
	declare user: User;

	@Column(DataType.STRING)
	declare profileImage: string;

	@Column(DataType.STRING)
	declare phoneNumber: string;

	@Column(DataType.STRING)
	declare addressLine1: string;

	@Column(DataType.STRING)
	declare addressLine2: string;

	@Column(DataType.STRING)
	declare city: string;

	@Column(DataType.STRING)
	declare state: string;

	@Column(DataType.STRING)
	declare medicalLicenseNumber: string;

	@Column(DataType.INTEGER)
	declare yearsOfExperience: number;

	@Column(DataType.TEXT)
	declare bio: string;

	@Default(false)
	@Column(DataType.BOOLEAN)
	declare onboardingCompleted: boolean;

	@Default(1)
	@Column(DataType.INTEGER)
	declare onboardingStep: number;
}
