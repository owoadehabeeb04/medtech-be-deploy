import * as dotenv from "dotenv";
import * as path from "path";
import { Sequelize } from "sequelize-typescript";
import { Dialect, QueryTypes } from "sequelize";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { GeocodingService, GeocodingError } from "../service/Geocoding/Geocoding.service";

const DB_HOST = process.env.DB_HOST || "localhost";
const USE_SSL = DB_HOST.includes("rds.amazonaws.com") || process.env.NODE_ENV === "production";

const sequelize = new Sequelize({
  dialect: "postgres" as Dialect,
  host: DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "merchant_db",
  logging: false,
  dialectOptions: USE_SSL ? { ssl: { require: true, rejectUnauthorized: false } } : undefined,
});

interface StoreRow {
  id: string;
  business_address: string;
  city: string | null;
  state: string | null;
}

/**
 * One-off: geocode existing stores that have a typed address but no coordinates yet.
 * Run with `npm run backfill:store-coordinates` (needs GOOGLE_MAPS_API_KEY).
 */
async function backfill() {
  await sequelize.authenticate();

  const stores = await sequelize.query<StoreRow>(
    `SELECT id, business_address, city, state
     FROM store_details
     WHERE latitude IS NULL
       AND business_address IS NOT NULL
       AND btrim(business_address) <> ''`,
    { type: QueryTypes.SELECT }
  );

  console.log(`Found ${stores.length} store(s) without coordinates`);

  let updated = 0;
  const failed: Array<{ id: string; reason: string }> = [];

  for (const store of stores) {
    try {
      const result = await GeocodingService.geocodeAddress({
        address: store.business_address,
        city: store.city,
        state: store.state,
      });

      await sequelize.query(
        `UPDATE store_details
         SET latitude = :latitude, longitude = :longitude,
             formatted_address = :formattedAddress, place_id = :placeId
         WHERE id = :id`,
        { replacements: { ...result, id: store.id } }
      );
      updated++;
    } catch (error: any) {
      failed.push({ id: store.id, reason: error instanceof GeocodingError ? error.message : String(error.message) });
    }
  }

  console.log(`Updated ${updated}, failed ${failed.length}`);
  failed.forEach((entry) => console.log(`  ${entry.id}: ${entry.reason}`));

  await sequelize.close();
}

backfill().catch(async (error) => {
  console.error("Backfill failed:", error);
  await sequelize.close();
  process.exit(1);
});
