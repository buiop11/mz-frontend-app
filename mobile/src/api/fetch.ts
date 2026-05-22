import { clearSession, loadSession } from '@/src/auth/storage';

import { API_BASE_URL } from './client';

type FetchInit = RequestInit & { skipAuth?: boolean };

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

function resolveUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const session = await loadSession();
  if (!session?.token) return {};
  return { Authorization: `Bearer ${session.token}` };
}

export async function apiFetch(
  pathOrUrl: string,
  options: FetchInit = {},
): Promise<Response> {
  const { skipAuth, headers: overrideHeaders, ...rest } = options;
  const auth = skipAuth ? {} : await authHeaders();

  const response = await fetch(resolveUrl(pathOrUrl), {
    ...rest,
    headers: {
      Accept: '*/*',
      ...auth,
      ...(overrideHeaders as Record<string, string> | undefined),
    },
  });

  if (response.status === 401) {
    await clearSession();
    unauthorizedHandler?.();
  }

  return response;
}
