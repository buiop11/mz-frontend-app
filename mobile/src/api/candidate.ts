import { apiFetch } from './fetch';

export type Candidate = {
  candidateSeq: number;
  topicSeq: number;
  memberSeq: number | null;
  name: string;
  info: string | null;
  price: number | null;
  imageUrl: string | null;
  linkUrl: string | null;
  fixed: boolean;
};

export type CandidateListRequest = {
  memberSeq: number;
  topicSeq: number;
  currentPage?: number;
};

function normalizeCandidate(row: any): Candidate | null {
  const candidateSeq =
    typeof row?.candidateSeq === 'number' ? row.candidateSeq : Number(row?.candidateSeq);
  const topicSeq = typeof row?.topicSeq === 'number' ? row.topicSeq : Number(row?.topicSeq);
  if (!Number.isFinite(candidateSeq) || candidateSeq <= 0) return null;
  if (!Number.isFinite(topicSeq) || topicSeq <= 0) return null;

  const name = typeof row?.name === 'string' ? row.name.trim() : '';
  if (!name) return null;

  const priceRaw = row?.price;
  const price =
    typeof priceRaw === 'number' && Number.isFinite(priceRaw)
      ? priceRaw
      : priceRaw != null && priceRaw !== ''
        ? Number(priceRaw)
        : null;

  return {
    candidateSeq,
    topicSeq,
    memberSeq:
      typeof row?.memberSeq === 'number'
        ? row.memberSeq
        : row?.memberSeq != null
          ? Number(row.memberSeq)
          : null,
    name,
    info: typeof row?.info === 'string' ? row.info.trim() || null : null,
    price: price != null && Number.isFinite(price) ? price : null,
    imageUrl:
      typeof row?.imageUrl === 'string' && row.imageUrl.trim() ? row.imageUrl.trim() : null,
    linkUrl: typeof row?.linkUrl === 'string' && row.linkUrl.trim() ? row.linkUrl.trim() : null,
    fixed: Boolean(row?.fixed),
  };
}

export function parseCandidateDetailResponse(json: unknown): Candidate | null {
  const root = json as { code?: string; data?: unknown };
  if (root?.code !== 'SUC001' || root.data == null) return null;
  return normalizeCandidate(root.data);
}

export async function getCandidateDetail(
  candidateSeq: number,
  memberSeq?: number,
): Promise<Candidate> {
  const q = memberSeq != null ? `?memberSeq=${encodeURIComponent(String(memberSeq))}` : '';
  const path = `/api/candidate/${candidateSeq}${q}`;

  const res = await apiFetch(path, { method: 'GET', headers: { Accept: 'application/json' } });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `후보 조회 실패 (${res.status})`);
  }
  if (json?.code !== 'SUC001') {
    throw new Error(json?.message ?? '후보 조회에 실패했습니다.');
  }

  const row = parseCandidateDetailResponse(json);
  if (!row) throw new Error('후보 정보를 읽을 수 없습니다.');
  return row;
}

export type SaveCandidateRequest = {
  memberSeq: number;
  topicSeq: number;
  name: string;
  info?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
};

function buildSaveBody(data: SaveCandidateRequest) {
  return {
    memberSeq: data.memberSeq,
    topicSeq: data.topicSeq,
    name: data.name.trim(),
    info: data.info?.trim() ? data.info.trim() : null,
    price: data.price != null && Number.isFinite(data.price) ? data.price : null,
    imageUrl: data.imageUrl?.trim() ? data.imageUrl.trim() : null,
    linkUrl: data.linkUrl?.trim() ? data.linkUrl.trim() : null,
  };
}

export async function createCandidate(data: SaveCandidateRequest): Promise<Candidate> {
  const res = await apiFetch('/api/candidate', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSaveBody(data)),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `후보 등록 실패 (${res.status})`);
  }
  if (json?.code && json.code !== 'SUC001') {
    throw new Error(json?.message ?? '후보 등록에 실패했습니다.');
  }

  const row = parseCandidateDetailResponse(json);
  if (row) return row;
  return {
    candidateSeq: Number(json?.data?.candidateSeq ?? Date.now()),
    topicSeq: data.topicSeq,
    memberSeq: data.memberSeq,
    name: data.name.trim(),
    info: data.info?.trim() || null,
    price: data.price ?? null,
    imageUrl: data.imageUrl?.trim() || null,
    linkUrl: data.linkUrl?.trim() || null,
    fixed: false,
  };
}

export async function updateCandidate(
  candidateSeq: number,
  data: SaveCandidateRequest,
): Promise<Candidate> {
  const res = await apiFetch(`/api/candidate/${candidateSeq}`, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSaveBody(data)),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `후보 수정 실패 (${res.status})`);
  }
  if (json?.code && json.code !== 'SUC001') {
    throw new Error(json?.message ?? '후보 수정에 실패했습니다.');
  }

  const row = parseCandidateDetailResponse(json);
  if (row) return row;
  return {
    candidateSeq,
    topicSeq: data.topicSeq,
    memberSeq: data.memberSeq,
    name: data.name.trim(),
    info: data.info?.trim() || null,
    price: data.price ?? null,
    imageUrl: data.imageUrl?.trim() || null,
    linkUrl: data.linkUrl?.trim() || null,
    fixed: false,
  };
}

export function parseCandidateListResponse(json: any): Candidate[] {
  if (json?.code !== 'SUC001') return [];
  const data = json?.data;
  const arr = Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : [];
  const list: Candidate[] = [];
  for (const row of arr) {
    const item = normalizeCandidate(row);
    if (item) list.push(item);
  }
  return list;
}

export async function getCandidateList(params: CandidateListRequest): Promise<Candidate[]> {
  const q = new URLSearchParams({
    memberSeq: String(params.memberSeq),
    topicSeq: String(params.topicSeq),
    currentPage: String(params.currentPage ?? 1),
  });
  const path = `/api/candidate/list?${q.toString()}`;

  const res = await apiFetch(path, { method: 'GET', headers: { Accept: 'application/json' } });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `후보 목록 조회 실패 (${res.status})`);
  }
  if (json?.code !== 'SUC001') {
    throw new Error(json?.message ?? '후보 목록 조회에 실패했습니다.');
  }

  return parseCandidateListResponse(json);
}

export function formatCandidatePrice(price: number | null): string {
  if (price == null || !Number.isFinite(price)) return '가격 미정';
  return `${price.toLocaleString('ko-KR')}원`;
}

export type PickCandidateRequest = {
  memberSeq: number;
  topicSeq: number;
  candidateSeq: number;
};

/** 최종 Pick — candidateSeq 를 서버에 전달 */
export async function pickCandidate(params: PickCandidateRequest): Promise<void> {
  const res = await apiFetch('/api/candidate/pick', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      memberSeq: params.memberSeq,
      topicSeq: params.topicSeq,
      candidateSeq: params.candidateSeq,
    }),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `Pick 처리 실패 (${res.status})`);
  }
  if (json?.code && json.code !== 'SUC001') {
    throw new Error(json?.message ?? 'Pick 처리에 실패했습니다.');
  }
}
