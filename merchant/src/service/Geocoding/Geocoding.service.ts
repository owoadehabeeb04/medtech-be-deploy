import axios from "axios";
import { applicationConfig } from "../../config";

const { geocoding } = applicationConfig;

// A result made up only of these is a city/state/country centre, not a place a pharmacy can be.
const COARSE_TYPES = ["country", "administrative_area_level_1", "administrative_area_level_2", "locality"];
const PRECISE_TYPES = [
  "street_address",
  "route",
  "premise",
  "subpremise",
  "establishment",
  "point_of_interest",
  "neighborhood",
  "sublocality",
  "sublocality_level_1",
  "plus_code",
];

export interface GeocodeInput {
  address: string;
  city?: string | null;
  state?: string | null;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId: string;
}

export class GeocodingError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "GeocodingError";
  }
}

export class GeocodingService {
  /**
   * Resolve a Nigerian street address to coordinates. Throws GeocodingError (400) when the
   * address can't be found or is too vague, and (503) when the lookup itself is unavailable.
   */
  static async geocodeAddress(input: GeocodeInput): Promise<GeocodeResult> {
    if (!geocoding.googleApiKey) {
      console.error("[Geocoding] GOOGLE_MAPS_API_KEY is not configured");
      throw new GeocodingError("Address verification is currently unavailable. Please try again later.", 503);
    }

    const query = [input.address, input.city, input.state, "Nigeria"]
      .map((part) => (part || "").trim())
      .filter(Boolean)
      .join(", ");

    let data: any;
    try {
      const response = await axios.get(geocoding.baseUrl, {
        params: { address: query, components: "country:NG", key: geocoding.googleApiKey },
        timeout: 8000,
      });
      data = response.data;
    } catch (error: any) {
      console.error("[Geocoding] Request failed:", error.message);
      throw new GeocodingError("Address verification is currently unavailable. Please try again later.", 503);
    }

    if (data?.status === "ZERO_RESULTS") {
      throw new GeocodingError("We couldn't find this address. Please check it and try again.", 400);
    }

    if (data?.status !== "OK" || !Array.isArray(data.results) || data.results.length === 0) {
      console.error("[Geocoding] Unexpected response:", data?.status, data?.error_message);
      throw new GeocodingError("Address verification is currently unavailable. Please try again later.", 503);
    }

    const best = data.results[0];
    const types: string[] = best.types || [];
    const isCoarseOnly =
      types.some((type) => COARSE_TYPES.includes(type)) && !types.some((type) => PRECISE_TYPES.includes(type));

    if (isCoarseOnly) {
      throw new GeocodingError(
        "This address is too general. Please include the street name and number.",
        400
      );
    }

    const location = best.geometry?.location;
    if (typeof location?.lat !== "number" || typeof location?.lng !== "number") {
      throw new GeocodingError("We couldn't find this address. Please check it and try again.", 400);
    }

    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: best.formatted_address,
      placeId: best.place_id,
    };
  }
}
