import "dotenv/config";

import { Worker } from "bullmq";

import { deliverMail } from "@/src/api/services/mail/mail.deliver";
import { MAIL_QUEUE_NAME, type MailJobPayload } from "@/src/queue/mail.queue";
import { createRedisForBullmq } from "@/src/queue/redisConnection";

const connection = createRedisForBullmq();

const worker = new Worker<MailJobPayload, void, "send">(
  MAIL_QUEUE_NAME,
  async (job) => {
    if (job.name !== "send") return;
    const { to, subject, htmlContent } = job.data;
    await deliverMail(to, subject, htmlContent);
  },
  { connection },
);

worker.on("completed", (job) => {
  console.log(`[mail-worker] job ${job.id} sent to ${job.data.to}`);
});

worker.on("failed", (job, err) => {
  console.error(`[mail-worker] job ${job?.id} failed`, err);
});

console.log(`[mail-worker] listening on queue "${MAIL_QUEUE_NAME}"`);
