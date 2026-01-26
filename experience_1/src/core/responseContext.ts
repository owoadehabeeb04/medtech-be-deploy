import { Handler, NextFunction, Request, Response } from "express";

interface IResponsePayload {
	message?: string;
	data?: Record<string, any>;
}

const handleApplicationResponses: Handler = (_: Request, res: Response, next: NextFunction) => {
	const response = res.response;
	if (!response) return next();

	const { data = {}, message, statusCode = 200 } = response;

	// Check if data is null, undefined, or an empty object
	const isEmptyData = data === null || data === undefined || (typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 0);

	// Only 404 when data is empty and no message
	if (isEmptyData && !message) {
		return res.status(404).json({ message: "Not found." });
	}

	const payload: IResponsePayload = {};
	if (message) payload.message = message;

	// Only add data if it's not null/undefined and has content
	if (data !== null && data !== undefined) {
		if (Array.isArray(data) || (typeof data === "object" && Object.keys(data).length > 0)) {
			payload.data = data;
		}
	}

	return res.status(statusCode).json(payload);
};

export default handleApplicationResponses;
