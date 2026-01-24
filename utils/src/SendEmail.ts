import * as nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import * as path from "path";
import * as fs from "fs";

export interface SMTPConfig {
  user: string;
  host: string;
  port: number;
  pass: string;
}

export default class SendEmail {
  private user: string;
  private host: string;
  private port: number;
  private password: string;
  private transporter: nodemailer.Transporter;
  private handlebarOptions: hbs.NodemailerExpressHandlebarsOptions;
  private mailOptions: nodemailer.SendMailOptions & any;

  constructor(smtpConfig: SMTPConfig, emailTemplatePath?: string) {
    this.user = smtpConfig.user;
    this.host = smtpConfig.host;
    this.port = smtpConfig.port;
    this.password = smtpConfig.pass;

    if (this.host && this.user && this.password) {
      const isGmail = this.host.includes("gmail.com");
      const emailConfig: any = {
        host: this.host,
        port: this.port,
        auth: { user: this.user, pass: this.password },
        secure: isGmail && this.port === 465,
        debug: true,
      };

      if (isGmail && this.port === 587) {
        emailConfig.requireTLS = true;
        emailConfig.tls = {
          rejectUnauthorized: false,
        };
      } else if (!isGmail) {
        emailConfig.secure = false;
        emailConfig.tls = {
          rejectUnauthorized: false,
        };
      }

      this.transporter = nodemailer.createTransport(emailConfig);
      console.log("SMTP transporter configured:", { 
        host: this.host, 
        port: this.port, 
        secure: emailConfig.secure,
        isGmail 
      });
    } else {
      console.warn("SMTP not fully configured - creating empty transporter");
      this.transporter = nodemailer.createTransport({});
    }

    // Use provided email template path or try to find it
    let emailPath = emailTemplatePath;
    if (!emailPath) {
      // Try merchant path first, then fallback to utils path
      const merchantEmailPath = path.resolve(__dirname, "../../merchant/src/view/emails/");
      const utilsEmailPath = path.resolve(__dirname, "../view/emails/");
      emailPath = fs.existsSync(merchantEmailPath) ? merchantEmailPath : utilsEmailPath;
    }

    this.handlebarOptions = {
      viewEngine: {
        partialsDir: emailPath,
        defaultLayout: "",
      },
      viewPath: emailPath,
    };

    if (!fs.existsSync(emailPath)) {
      console.error("Email template path does not exist:", emailPath);
      throw new Error(`Email template path does not exist: ${emailPath}`);
    }

    console.log("Email templates initialized with path:", emailPath);
    this.transporter.use("compile", hbs(this.handlebarOptions));
  }

  async send(
    to: string | string[],
    subject: string,
    template: string,
    data: any,
    cc?: string | string[]
  ) {
    if (!this.host || !this.user || !this.password) {
      const errorMsg = "SMTP not configured. Email not sent. Configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env";
      console.error(errorMsg);
      console.error("Current SMTP config:", { host: this.host, user: this.user, hasPassword: !!this.password });
      throw new Error(errorMsg);
    }

    if (Array.isArray(to)) {
      to = to.filter(email => !email.includes("@example.com"));
      if (to.length === 0) {
        throw new Error("All recipient emails are invalid (@example.com addresses are not real)");
      }
    } else if (to.includes("@example.com")) {
      throw new Error("Cannot send email to @example.com - this is not a real email domain. Please use a real email address.");
    }

    if (!this.handlebarOptions || !this.handlebarOptions.viewPath) {
      const errorMsg = "Email template path not configured";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.mailOptions = {
      from: `"Quick Medic" <${this.user}>`,
      to,
      subject,
      template,
      context: data,
      cc,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(this.mailOptions, function (error, info) {
        if (error) {
          console.error("Email send error:", error);
          const errorWithCode = error as Error & { code?: string; response?: string; responseCode?: number };
          console.error("Email details:", { 
            to, 
            subject, 
            template, 
            errorCode: errorWithCode.code, 
            errorMessage: error.message,
            response: errorWithCode.response,
            responseCode: errorWithCode.responseCode
          });
          
          if (errorWithCode.code === "EAUTH") {
            console.error("Authentication failed. Check your SMTP credentials (username/password).");
            console.error("For Gmail, make sure you're using an App Password, not your regular password.");
          }
          
          return reject(error);
        }
        
        console.log("Email sent successfully:", { 
          to, 
          subject, 
          messageId: info?.messageId,
          accepted: info?.accepted,
          rejected: info?.rejected,
          response: info?.response
        });
        
        if (info?.rejected && info.rejected.length > 0) {
          console.warn("Some recipients were rejected:", info.rejected);
        }
        
        resolve(to);
      });
    });
  }
}
