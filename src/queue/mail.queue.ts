import { Queue } from "bullmq";

import { createRedisForBullmq } from "@/src/queue/redisConnection";

export const MAIL_QUEUE_NAME = "mail";

export type MailJobPayload = {
  to: string;
  subject: string;
  htmlContent: string;
};

let mailQueue: Queue<MailJobPayload, void, "send"> | null = null;

function getMailQueue(): Queue<MailJobPayload, void, "send"> {
  if (!mailQueue) {

    mailQueue = new Queue<MailJobPayload, void, "send">(MAIL_QUEUE_NAME, {
      connection: createRedisForBullmq(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }

  return mailQueue;
}

/**
 * Enqueues an email for delivery by the mail worker. Returns after the job is stored in Redis (non-blocking for SMTP).
 */
export async function enqueueMail(payload: MailJobPayload): Promise<void> {
  await getMailQueue().add("send", payload);
}
