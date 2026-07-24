import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";
import {
  ProposedEdit,
  ProposedEditStatus,
} from "@/src/api/entities/ProposedEdit";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { canEditPerson } from "@/src/lib/permissions";

/** GET /api/persons/[id]/proposed-edits */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const person = await AppDataSource.getRepository(Person).findOne({
    where: { id: Number(id) },
  });
  if (!person) return apiError(ApiError.notFound("Person not found."));
  if (!(await canEditPerson(user, person))) {
    return apiError(ApiError.forbidden("Steward access required."));
  }

  const edits = await AppDataSource.getRepository(ProposedEdit).find({
    where: { personId: Number(id), status: ProposedEditStatus.PENDING },
    order: { createdAt: "DESC" },
  });

  return apiSuccess({ proposedEdits: edits }, "Proposed edits retrieved");
}
