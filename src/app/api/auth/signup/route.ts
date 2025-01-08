import { NextRequest } from "next/server";

import { createUser, findUserByEmail } from "@/src/api/services/user.service";
import { initializeDataSource } from "@/src/config/db";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { sendMail } from "@/src/api/services/mail/mail.service";

export async function POST(req: NextRequest) {
  await initializeDataSource();

  const { name, email, password } = await req.json();

  try {
    if (!email || !password) {
      throw ApiError.badRequest("Some Fields are missing.");
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      throw ApiError.badRequest("Email already in use.");
    }

    const user = await createUser(name, email, password);
    const customHtml = `
      <h1 class="header">Welcome to Chama Smart! 🎉</h1>
      <p>Hi <strong>${name}</strong>,</p>
      <p>We’re thrilled to have you on board! Chama Smart is here to simplify your group management experience, empowering you with tools for seamless communication, insightful data analysis, and efficient financial collaboration.</p>
      <h3>Here’s what you can do next:</h3>
      <ul>
        <li><strong>Explore Your Dashboard</strong>: Gain a clear overview of your group activities.</li>
        <li><strong>Stay Connected</strong>: Use WhatsApp integration to keep everyone updated.</li>
        <li><strong>Leverage Insights</strong>: Analyze group trends and make data-driven decisions with our smart tools.</li>
      </ul>
      <p>If you need any help or have questions, feel free to reach out to us at <a href="mailto:support@chamasmart.com">support@chamasmart.com</a>.</p>
      <p><a href="https://chamasmart.com/dashboard" class="button">Get Started</a></p>
      <p>Let’s build something amazing together!</p>
    `;

    await sendMail(email, "Welcome to Chama Smart", customHtml);

    // @ts-ignore
    delete user?.password;

    return apiSuccess({ user });
  } catch (error: any) {
    return apiError(error);
  }
}
