export type ApiEnvelope<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

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
    throw new Error(
      typeof body.error === "string" ? body.error : res.statusText,
    );
  }

  return body.data as T;
}
