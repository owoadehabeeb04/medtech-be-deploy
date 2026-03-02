export interface SMTPConfig {
    user: string;
    host: string;
    port: number;
    pass: string;
}
export default class SendEmail {
    private user;
    private host;
    private port;
    private password;
    private transporter;
    private handlebarOptions;
    private mailOptions;
    constructor(smtpConfig: SMTPConfig, emailTemplatePath?: string);
    send(to: string | string[], subject: string, template: string, data: any, cc?: string | string[]): Promise<unknown>;
}
//# sourceMappingURL=SendEmail.d.ts.map