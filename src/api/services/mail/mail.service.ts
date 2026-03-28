import nodemailer from "nodemailer";
import { baseTemplate } from "@/src/api/services/mail/baseTemplate";

const transporter = nodemailer.createTransport({
  // host: process.env.SMTP_HOST,
  // port: Number(process.env.SMTP_PORT) || 587,
  // auth: {
  //   user: process.env.SMTP_USER,
  //   pass: process.env.SMTP_PASS,
  // },
  service: "Gmail", // Email service provider
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Sends an email with a base template.
 * @param to Recipient email address
 * @param subject Email subject
 * @param htmlContent Custom HTML content for the email
 */
export const sendMail = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> => {
  try {
    const mailOptions = {
      from: `My Ukoo <${process.env.MAIL_FROM || "no-reply@myukoo.com"}>`,
      to,
      subject,
      html: baseTemplate(htmlContent, to)
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};
