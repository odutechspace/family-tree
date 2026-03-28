import { NextRequest } from "next/server";

import { createUser, findUserByEmail } from "@/src/api/services/user.service";
import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { sendMail } from "@/src/api/services/mail/mail.service";
import { tryHashPhone } from "@/src/lib/identity";
import { Person } from "@/src/api/entities/Person";
import { User } from "@/src/api/entities/User";

export async function POST(req: NextRequest) {
  await initializeDataSource();

  const body = await req.json();
  const { name, email, password, phone } = body as {
    name: string;
    email: string;
    password: string;
    phone?: string;
  };

  try {
    if (!email || !password) {
      throw ApiError.badRequest("Some Fields are missing.");
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      throw ApiError.badRequest("Email already in use.");
    }

    const user = await createUser(name, email, password);

    // Hash phone if provided and attempt auto-link to an unlinked Person record
    const phoneHash = phone ? tryHashPhone(phone) : null;

    if (phoneHash) {
      const userRepo = AppDataSource.getRepository(User);

      await userRepo.update(user.id, { phoneHash });

      const personRepo = AppDataSource.getRepository(Person);
      const matchingPerson = await personRepo
        .createQueryBuilder("person")
        .where("person.phoneHash = :phoneHash", { phoneHash })
        .andWhere("person.linkedUserId IS NULL")
        .getOne();

      if (matchingPerson) {
        await personRepo.update(matchingPerson.id, { linkedUserId: user.id });
        await userRepo.update(user.id, { linkedPersonId: matchingPerson.id });
      }
    }

    const customHtml = `
      <h1 class="header">Welcome to Ukoo – Discover Your Roots! 🌳</h1>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Welcome to Ukoo, where your journey to connect, discover, and preserve your family heritage begins! 🎉</p>
      <p>We're thrilled to have you on board. At Ukoo, we believe every family story is a treasure, and we're here to help you explore yours.</p>
      <h3>Here's what you can do next:</h3>
      <ul>
        <li><strong>Start Building Your Tree</strong>: Begin adding family members and creating your personalized family tree.</li>
        <li><strong>Explore Your History</strong>: Discover fascinating insights about your heritage.</li>
        <li><strong>Connect Generations</strong>: Share your tree and collaborate with family to grow your Ukoo.</li>
      </ul>
      <p>To get started, log in to your account here: <br/><a href="https://myukoo.com" class="button">Get Started</a></p>
      <p>If you have any questions or need assistance, our support team is always here to help at <a href="mailto:support@myukoo.com">support@myukoo.com</a>.</p>
      <p>Thank you for choosing Ukoo. Together, let's celebrate your family's story.</p>
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
