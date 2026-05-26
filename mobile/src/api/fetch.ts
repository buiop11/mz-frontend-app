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
  const url = resolveUrl(pathOrUrl);
  const method = (rest.method ?? 'GET').toUpperCase();
  const requestInit = { ...rest };

  if ((method === 'GET' || method === 'HEAD') && requestInit.body != null) {
    console.warn('[apiFetch] GET/HEAD 요청의 body는 전송하지 않습니다.', { method, url });
    delete requestInit.body;
  }

  // 어떤 호출이 어디로 가는지 콘솔에 명확하게 남겨서 네트워크 탭이 없는 상황(웹/네이티브 모두)에서도 추적 가능하게 한다.
  console.info('[apiFetch] →', method, url, { hasAuth: Boolean((auth as any).Authorization) });

  let response: Response;
  try {
    response = await fetch(url, {
      ...requestInit,
      headers: {
        Accept: '*/*',
        ...auth,
        ...(overrideHeaders as Record<string, string> | undefined),
      },
    });
  } catch (e: any) {
    // 네트워크 단계에서 실패한 경우 (CORS, DNS, 서버 다운, 잘못된 URL 등) — 그대로 던지되 콘솔 로그를 남긴다.
    console.error('[apiFetch] ✗ network error', method, url, e);
    throw e;
  }

  if (response.ok) {
    console.info('[apiFetch] ←', response.status, method, url);
  } else {
    console.warn('[apiFetch] ← non-OK', response.status, method, url);
  }

  if (response.status === 401) {
    console.warn('[apiFetch] 401 unauthorized → clearing session', { url });
    await clearSession();
    unauthorizedHandler?.();
  }

  return response;
}
