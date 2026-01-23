import * as nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import * as path from "path";
import { applicationConfig } from "../config";

const { mailOptions } = applicationConfig;

export default class SendEmail {
	private user: string;
	private host: string;
	private port: number;
	private password: string;
	private transporter: nodemailer.Transporter;
	private handlebarOptions: hbs.NodemailerExpressHandlebarsOptions;
	private mailOptions: nodemailer.SendMailOptions & any;

	constructor() {
		this.user = mailOptions.username;
		this.host = mailOptions.host;
		this.port = Number(mailOptions.port);
		this.password = mailOptions.password;

		let emailConfig = {
			host: this.host,
			port: this.port,
			auth: { user: this.user, pass: this.password },
			secure: false,
			debug: true,
			tls: { ciphers: "SSLv3" },
		};

		this.transporter = nodemailer.createTransport(emailConfig);

		this.handlebarOptions = {
			viewEngine: {
				partialsDir: path.resolve("./src/view/emails/"),
				defaultLayout: false,
			},
			viewPath: path.resolve("./src/view/emails/"),
		};

		this.transporter.use("compile", hbs(this.handlebarOptions));
	}

	async send(to: string | string[], subject: string, template: any, data: any, cc?: string | string[]) {
		this.mailOptions = {
			from: `"Quick Medic" <${this.user}>`,
			to,
			subject,
			template,
			context: data,
			cc,
		};

		return new Promise((resolve, reject) => {
			this.transporter.sendMail(this.mailOptions, function (error, data) {
				if (error) {
					console.log(error, "mail error_______");
					return reject(error);
				}
				resolve(to);
			});
		});
	}
}
