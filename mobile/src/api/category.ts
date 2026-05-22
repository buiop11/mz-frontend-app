import { API_BASE_URL } from './client';

export type Category = {
  categorySeq: number;
  name: string;
  iconUrl: string | null;
};

export type CategoryParseResult = {
  list: Category[];
  fromApi: boolean;
};

export const FALLBACK_CATEGORIES: Category[] = [
  { categorySeq: -1, name: '웨딩', iconUrl: null },
  { categorySeq: -2, name: '구매', iconUrl: null },
  { categorySeq: -3, name: '데이트', iconUrl: null },
  { categorySeq: -4, name: '식사', iconUrl: null },
];

function normalizeList(json: any): Category[] {
  const list = json?.data?.list;
  if (!Array.isArray(list)) return [];
  return list
    .map((row: any) => ({
      categorySeq:
        typeof row?.categorySeq === 'number'
          ? row.categorySeq
          : Number(row?.categorySeq) || 0,
      name: typeof row?.name === 'string' ? row.name.trim() : '',
      iconUrl:
        typeof row?.iconUrl === 'string' && row.iconUrl.trim()
          ? row.iconUrl.trim()
          : null,
    }))
    .filter((row: Category) => row.name.length > 0);
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
