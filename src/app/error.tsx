"use client";

import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { Button } from "@/src/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    /* eslint-disable no-console */
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            {error.message || "An unexpected error occurred."}
          </AlertDescription>
        </Alert>
        <Button className="w-full" type="button" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
