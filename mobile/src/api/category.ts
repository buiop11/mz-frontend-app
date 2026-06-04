import { API_BASE_URL } from './client';
import { apiFetch } from './fetch';

export type Category = {
  categorySeq: number;
  name: string;
  emoji: string;
  iconUrl: string | null;
};

function resolveCategoryEmoji(row: Record<string, unknown>): string {
  const raw =
    row.emoji ?? row.iconEmoji ?? row.categoryEmoji ?? row.emojiIcon ?? null;
  let text = '';
  if (typeof raw === 'string') text = raw.trim();
  else if (typeof raw === 'number' || typeof raw === 'boolean') text = String(raw).trim();
  return text || '📌';
}

function mapCategoryRow(row: Record<string, unknown>): Category | null {
  const categorySeq =
    typeof row.categorySeq === 'number' ? row.categorySeq : Number(row.categorySeq) || 0;
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!categorySeq || !name) return null;
  const iconUrl =
    typeof row.iconUrl === 'string' && row.iconUrl.trim() ? row.iconUrl.trim() : null;
  return {
    categorySeq,
    name,
    emoji: resolveCategoryEmoji(row),
    iconUrl,
  };
}

export type CategoryParseResult = {
  list: Category[];
  fromApi: boolean;
};

export type CategoryListRequest = {
  memberSeq: number;
  currentPage?: number;
};

export const FALLBACK_CATEGORIES: Category[] = [
  { categorySeq: -1, name: '웨딩', emoji: '💍', iconUrl: null },
  { categorySeq: -2, name: '구매', emoji: '🛒', iconUrl: null },
  { categorySeq: -3, name: '데이트', emoji: '💕', iconUrl: null },
  { categorySeq: -4, name: '식사', emoji: '🍽️', iconUrl: null },
];

function normalizeList(json: any): Category[] {
  const list = json?.data?.list;
  if (!Array.isArray(list)) return [];
  return list
    .map((row: any) => mapCategoryRow(row && typeof row === 'object' ? row : {}))
    .filter((row): row is Category => row != null);
}

export function parseCategoryApiResponse(json: any): CategoryParseResult {
  if (json?.code !== 'SUC001' || !json?.data) {
    return { list: FALLBACK_CATEGORIES, fromApi: false };
  }
  const list = normalizeList(json);
  if (list.length === 0) {
    return { list: FALLBACK_CATEGORIES, fromApi: false };
  }
  return { list, fromApi: true };
}

export function resolveBackendApiRoot(): string {
  return API_BASE_URL.replace(/\/$/, '');
}

export async function getCategories(
  params: { currentPage?: number } = {},
): Promise<CategoryParseResult> {
  const currentPage = params.currentPage ?? 1;
  const url = `${resolveBackendApiRoot()}/api/category?currentPage=${encodeURIComponent(currentPage)}`;
  try {
    const res = await fetch(url, { headers: { Accept: '*/*' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return parseCategoryApiResponse(json);
  } catch {
    return { list: FALLBACK_CATEGORIES, fromApi: false };
  }
}

export async function getMemberCategories(params: CategoryListRequest): Promise<CategoryParseResult> {
  const q = new URLSearchParams({
    memberSeq: String(params.memberSeq),
    currentPage: String(params.currentPage ?? 1),
  });
  const path = `/api/category/list?${q.toString()}`;

  const res = await apiFetch(path, { method: 'GET', headers: { Accept: 'application/json' } });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `카테고리 조회 실패 (${res.status})`);
  }
  if (json?.code !== 'SUC001') {
    throw new Error(json?.message ?? '카테고리 조회에 실패했습니다.');
  }

  // 계약: data가 배열
  const arr = Array.isArray(json?.data) ? json.data : [];
  const list: Category[] = arr
    .map((row: any) => mapCategoryRow(row && typeof row === 'object' ? row : {}))
    .filter((row: Category | null): row is Category => row != null);

  if (list.length === 0) return { list: FALLBACK_CATEGORIES, fromApi: false };
  return { list, fromApi: true };
}

export type CategorySaveRequest = {
  memberSeq: number;
  name: string;
  emoji: string;
};

export type CategoryUpdateRequest = CategorySaveRequest & {
  categorySeq: number;
};

async function parseCategoryMutationResponse(res: Response): Promise<void> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message ?? `카테고리 처리 실패 (${res.status})`);
  }
  if (json?.code !== 'SUC001') {
    throw new Error(json?.message ?? '카테고리 처리에 실패했습니다.');
  }
}

export async function createCategory(data: CategorySaveRequest): Promise<void> {
  const res = await apiFetch('/api/category', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  await parseCategoryMutationResponse(res);
}

export async function updateCategory(data: CategoryUpdateRequest): Promise<void> {
  const res = await apiFetch('/api/category', {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  await parseCategoryMutationResponse(res);
}

export async function deleteCategory(memberSeq: number, categorySeq: number): Promise<void> {
  const q = new URLSearchParams({
    memberSeq: String(memberSeq),
  });
  const res = await apiFetch(`/api/category/${categorySeq}?${q.toString()}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  await parseCategoryMutationResponse(res);
}
