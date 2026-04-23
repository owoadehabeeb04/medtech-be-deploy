export const ngnToKobo = (amountNgn: number): number => {
	const parsed = Number(amountNgn);
	if (!Number.isFinite(parsed)) {
		throw new Error("Invalid NGN amount");
	}

	return Math.round(parsed * 100);
};

export const koboToNgn = (amountKobo?: number | null): number | null => {
	if (amountKobo === null || amountKobo === undefined) {
		return null;
	}

	return Number((amountKobo / 100).toFixed(2));
};
