import { DataTypes } from "sequelize";
import { Sequelize } from "sequelize-typescript";

/** Keep old orders at zero: never change totals for payments already initialized. */
export async function ensureOrderServiceChargeColumn(sequelize: Sequelize): Promise<void> {
	const queryInterface = sequelize.getQueryInterface();
	let columns;
	try {
		columns = await queryInterface.describeTable("drugstore_orders");
	} catch (error: any) {
		// A new development database gets the column when models are synced.
		if (/does not exist|No description found/i.test(error?.message || "")) return;
		throw error;
	}
	if (!columns.service_charge) {
		await queryInterface.addColumn("drugstore_orders", "service_charge", {
			type: DataTypes.DECIMAL(12, 2),
			allowNull: false,
			defaultValue: 0,
		});
	}
}
