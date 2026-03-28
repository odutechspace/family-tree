import nodemailer from "nodemailer";

import { baseTemplate } from "@/src/api/services/mail/baseTemplate";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends email via SMTP. Used only by the BullMQ mail worker — not from API request handlers.
 */
export async function deliverMail(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<void> {
  const mailOptions = {
    from: `My Ukoo <${process.env.MAIL_FROM || "no-reply@myukoo.com"}>`,
    to,
    subject,
    html: baseTemplate(htmlContent, to),
  };

  await transporter.sendMail(mailOptions);
}
