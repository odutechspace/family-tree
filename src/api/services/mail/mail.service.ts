import { enqueueMail } from "@/src/queue/mail.queue";

/**
 * Schedules an email to be sent asynchronously via BullMQ. The HTTP handler only waits on Redis, not SMTP.
 */
export async function sendMail(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<void> {
  await enqueueMail({ to, subject, htmlContent });
}
