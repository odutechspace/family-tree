import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { User } from "@/src/api/entities/User";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { getRelatives } from "@/src/api/services/graph/relatives.service";

/** GET /api/me/relatives — graph around the user's linked person */
export async function GET(req: NextRequest) {
  await initializeDataSource();
  const auth = await getAuthUser(req);

  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: auth.id },
    select: ["id", "linkedPersonId"],
  });

  if (!user?.linkedPersonId) {
    return apiSuccess(
      { nodes: [], edges: [], linkedPersonId: null },
      "No linked person",
    );
  }

  const result = await getRelatives([user.linkedPersonId], {
    viewerUserId: auth.id,
    viewerRole: auth.role,
  });

  return apiSuccess(
    {
      linkedPersonId: user.linkedPersonId,
      nodes: result.nodes,
      edges: result.edges,
    },
    "Relatives retrieved",
  );
}
