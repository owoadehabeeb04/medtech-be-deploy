import { Column, DataType, Model, Table, Unique } from "sequelize-typescript";

@Table({ tableName: "consultation_types", timestamps: false })
export class ConsultationType extends Model<ConsultationType> {
	@Column(DataType.STRING)
	declare name: string;

	@Unique(true)
	@Column(DataType.STRING)
	declare key: string;

	@Column(DataType.BOOLEAN)
	declare isActive: boolean;

	static async getAllConsultationTypes(): Promise<ConsultationType[] | []> {
		return await this.findAll({ where: { isActive: true } });
	}
}
