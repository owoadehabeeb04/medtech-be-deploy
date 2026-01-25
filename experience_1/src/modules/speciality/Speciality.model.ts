import { Column, DataType, Model, Table, Unique } from "sequelize-typescript";

@Table({ tableName: "specialities", timestamps: false })
export class Speciality extends Model<Speciality> {
	@Column(DataType.STRING)
	declare name: string;

	@Unique(true)
	@Column(DataType.STRING)
	declare key: string;

	@Column(DataType.BOOLEAN)
	declare isActive: boolean;

	static async getAllSpecialities(): Promise<Speciality[]> {
		return await this.findAll({ order: [["name", "ASC"]] });
	}

	static async getSpecialityById(id: number): Promise<Speciality | null> {
		return await this.findByPk(id);
	}

	static async updateSpeciality(id: number, updates: Partial<{ name: string; key: string; isActive: boolean }>): Promise<Speciality | null> {
		const speciality = await this.findByPk(id);
		if (!speciality) {
			return null;
		}
		return await speciality.update(updates);
	}
	static async deleteSpeciality(id: number): Promise<void> {
		const speciality = await this.findByPk(id);
		if (speciality) {
			await speciality.destroy();
		}
	}

	static async createSpeciality(data: { name: string; key: string; isActive: boolean }): Promise<Speciality> {
		return await this.create(data);
	}

	static async getActiveSpecialities(): Promise<Speciality[]> {
		return await this.findAll({ where: { isActive: true }, order: [["name", "ASC"]] });
	}

	static async getSpecialityByKey(key: string): Promise<Speciality | null> {
		return await this.findOne({ where: { key } });
	}
}
