export type ApiEnvelope<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/** Thrown by api-fetch helpers so callers can branch on HTTP status (e.g. skip retries on 403). */
export class ApiFetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiFetchError";
    this.status = status;
  }
}

function throwIfNotOk(res: Response, body: ApiEnvelope): never {
  const message =
    typeof body.error === "string"
      ? body.error
      : typeof body.message === "string"
        ? body.message
        : res.statusText || "Request failed";
  throw new ApiFetchError(message, res.status);
}

/**
 * GET JSON and return the API `data` field. Throws if the response is not ok.
 */
export async function apiGetData<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!res.ok) {
    throwIfNotOk(res, body);
  }

  return body.data as T;
}

export type PersonListResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

/**
 * GET /api/persons — `data` is a person array; `total` / `page` / `limit` are top-level.
 */
export async function apiGetPersonList<T>(
  url: string,
  init?: RequestInit,
): Promise<PersonListResult<T>> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T[]> & {
    total?: number;
    page?: number;
    limit?: number;
  };

  if (!res.ok) {
    throwIfNotOk(res, body);
  }

  const items = body.data ?? [];

  return {
    items,
    total: body.total ?? items.length,
    page: body.page ?? 1,
    limit: body.limit ?? items.length,
  };
}
