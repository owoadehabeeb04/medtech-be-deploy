import { RESPONSE_MESSAGES } from "../../constants/response";
import { ApiResponse } from "../../utils/common.dto";

// No pharmacy capacity/scheduling system exists yet to check against, so this is a stateless
// generator over a fixed template rather than a real availability lookup — matches the design's
// "cannot be delayed more than 5 days" rule and slot list, but doesn't reflect true pharmacy load.
const SLOT_TEMPLATE = [
	"09:00 AM - 10:00 AM",
	"10:00 AM - 11:00 AM",
	"11:00 AM - 12:00 PM",
	"12:00 PM - 01:00 PM",
	"01:00 PM - 02:00 PM",
	"02:00 PM - 03:00 PM",
	"03:00 PM - 04:00 PM",
	"04:00 PM - 05:00 PM",
	"06:00 PM - 07:00 PM",
	"07:00 PM - 08:00 PM",
	"08:00 PM - 09:00 PM",
	"09:00 PM - 10:00 PM",
];

const WINDOW_DAYS = 5;

const parseSlotStartHour24 = (slot: string): number => {
	const [, startTime] = slot.split(" - ");
	const match = startTime.match(/(\d{1,2}):(\d{2}) (AM|PM)/);
	if (!match) return 0;
	let hour = Number(match[1]) % 12;
	if (match[3] === "PM") hour += 12;
	return hour;
};

// Local-time based on purpose: getHours() below (used to filter today's already-passed slots) is
// also local-time, so the date label and the hour check must agree on the same clock. toISOString()
// is always UTC regardless of the server's configured timezone — mixing it with getHours() here
// would disagree on what day it even is during the UTC/local crossover window (e.g. the first hour
// of each day in any timezone ahead of UTC, which includes Africa/Lagos, UTC+1).
const formatDate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

export class DrugstoreTimeSlotsService {
	static async getAvailableSlots(fulfillmentMethod: "delivery" | "pickup"): Promise<ApiResponse> {
		const now = new Date();
		const today = formatDate(now);
		const dates: string[] = [];
		const slotsByDate: Record<string, string[]> = {};

		for (let offset = 0; offset < WINDOW_DAYS; offset++) {
			const day = new Date(now);
			day.setDate(day.getDate() + offset);
			const dateKey = formatDate(day);
			dates.push(dateKey);

			slotsByDate[dateKey] =
				dateKey === today ? SLOT_TEMPLATE.filter((slot) => parseSlotStartHour24(slot) > now.getHours()) : [...SLOT_TEMPLATE];
		}

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: {
				fulfillmentMethod,
				dates,
				slots: slotsByDate,
			},
		};
	}
}
