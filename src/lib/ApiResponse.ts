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
