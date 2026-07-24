import { NextResponse } from "next/server";

import { ApiError } from "./ApiError";

export const apiSuccess = (
  data: any,
  message = "Success",
  statusCode = 200,
) => {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status: statusCode },
  );
};

/** `data` is the array; pagination fields are top-level siblings (not nested). */
export const apiListSuccess = <T>(
  items: T[],
  meta: { total: number; page: number; limit: number },
  message = "Success",
  statusCode = 200,
) => {
  return NextResponse.json(
    {
      success: true,
      message,
      data: items,
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
    },
    { status: statusCode },
  );
};

export const apiError = (error: ApiError | Error) => {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        details: error.details || null,
      },
      { status: error.statusCode },
    );
  }

  // Handle generic errors
  return NextResponse.json(
    {
      success: false,
      message: "An unexpected error occurred.",
      details: null,
    },
    { status: 500 },
  );
};
