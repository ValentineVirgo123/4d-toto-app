/**
 * Central API client — all interactors import from here.
 * Update EXPO_PUBLIC_API_URL in mobile-app/.env when ngrok restarts.
 */
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://nonvascular-martina-nonfacetiously.ngrok-free.dev/api';

const DEFAULT_HEADERS: Record<string, string> = {
  'ngrok-skip-browser-warning': 'true',
};

async function request<T>(
  method:     string,
  path:       string,
  body?:      unknown,
  isFormData  = false,
): Promise<T> {
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body
        ? JSON.stringify(body)
        : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  get:      <T>(path: string)                         => request<T>('GET',   path),
  post:     <T>(path: string, body: unknown)          => request<T>('POST',  path, body),
  postForm: <T>(path: string, form: FormData)         => request<T>('POST',  path, form, true),
  patch:    <T>(path: string, body: unknown)          => request<T>('PATCH', path, body),
};
