import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import handlebars from "handlebars";
import { applicationConfig } from "../config";

type EmailRecipient = {
	email: string;
};

export default class SendEmail {
	private readonly apiKey: string;
	private readonly senderEmail: string;
	private readonly senderName: string;
	private readonly baseUrl: string;
	private readonly emailTemplatePath: string;

	constructor() {
		this.apiKey = applicationConfig.brevo.apiKey;
		this.senderEmail = applicationConfig.brevo.senderEmail;
		this.senderName = applicationConfig.brevo.senderName || "";
		this.baseUrl = applicationConfig.brevo.baseUrl || "";
		this.emailTemplatePath = path.resolve("./src/view/emails/");
	}

	async send(to: string | string[], subject: string, template: string, data: any, cc?: string | string[]) {
		if (!this.apiKey || !this.senderEmail) {
			throw new Error("Brevo is not configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL.");
		}

		const toRecipients = this.normalizeRecipients(to);
		const ccRecipients = cc ? this.normalizeRecipients(cc) : [];

		if (toRecipients.length === 0) {
			throw new Error("At least one valid recipient is required.");
		}

		const payload = JSON.stringify({
			sender: {
				email: this.senderEmail,
				name: this.senderName,
			},
			to: toRecipients,
			cc: ccRecipients.length > 0 ? ccRecipients : undefined,
			subject,
			htmlContent: this.renderTemplate(template, data),
		});

		await this.post("/v3/smtp/email", payload);

		return toRecipients.map((recipient) => recipient.email);
	}

	private normalizeRecipients(recipients: string | string[]): EmailRecipient[] {
		const recipientList = Array.isArray(recipients) ? recipients : [recipients];

		return recipientList
			.map((email) => email.trim())
			.filter((email) => email.length > 0 && !email.includes("@example.com"))
			.map((email) => ({ email }));
	}

	private renderTemplate(template: string, data: any): string {
		const templateFilePath = path.resolve(this.emailTemplatePath, `${template}.handlebars`);

		if (!fs.existsSync(templateFilePath)) {
			throw new Error(`Email template not found: ${templateFilePath}`);
		}

		const templateSource = fs.readFileSync(templateFilePath, "utf8");
		const compiledTemplate = handlebars.compile(templateSource);

		return compiledTemplate(data);
	}

	private post(endpoint: string, payload: string): Promise<void> {
		const url = new URL(endpoint, this.baseUrl);

		return new Promise((resolve, reject) => {
			const request = https.request(
				{
					method: "POST",
					protocol: url.protocol,
					hostname: url.hostname,
					port: url.port || (url.protocol === "https:" ? 443 : 80),
					path: `${url.pathname}${url.search}`,
					headers: {
						"Content-Type": "application/json",
						"Content-Length": Buffer.byteLength(payload),
						"api-key": this.apiKey,
						Accept: "application/json",
					},
				},
				(response) => {
					let responseBody = "";

					response.on("data", (chunk) => {
						responseBody += chunk;
					});

					response.on("end", () => {
						if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
							resolve();
							return;
						}

						let errorMessage = "Brevo email request failed";

						if (responseBody) {
							try {
								const parsedResponse = JSON.parse(responseBody);
								errorMessage =
									parsedResponse.message ||
									parsedResponse.code ||
									parsedResponse.error ||
									errorMessage;
							} catch {
								errorMessage = responseBody;
							}
						}

						reject(new Error(errorMessage));
					});
				}
			);

			request.on("error", reject);
			request.write(payload);
			request.end();
		});
	}
}
