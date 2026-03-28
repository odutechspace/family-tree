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
      <h1 class="header">Welcome to Ukoo – Discover Your Roots! 🌳</h1>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Welcome to Ukoo, where your journey to connect, discover, and preserve your family heritage begins! 🎉</p>
      <p>We’re thrilled to have you on board. At Ukoo, we believe every family story is a treasure, and we’re here to help you explore yours.</p>
      <h3>Here’s what you can do next:</h3>
      <ul>
        <li><strong>Start Building Your Tree</strong>: Begin adding family members and creating your personalized family tree.</li>
        <li><strong>Explore Your History</strong>: Discover fascinating insights about your heritage.</li>
        <li><strong>Connect Generations</strong>: Share your tree and collaborate with family to grow your Ukoo.</li>
      </ul>
      <p>To get started, log in to your account here: <br/><a href="https://myukoo.com" class="button">Get Started</a></p>
      <p>If you have any questions or need assistance, our support team is always here to help at <a href="mailto:support@myukoo.com">support@myukoo.com</a>.</p>
      <p>Thank you for choosing Ukoo. Together, let’s celebrate your family’s story.</p>
      <br/>
      <p>Warm regards,</p>
      <p>The Ukoo Team</p>
    `;

    await sendMail(email, "Welcome to Ukoo", customHtml);

    // @ts-ignore
    delete user?.password;

    return apiSuccess({ user });
  } catch (error: any) {
    return apiError(error);
  }
}
