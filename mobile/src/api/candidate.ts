import { resolveFilePathToUrl, type FileUploadResult } from './file';
import { apiFetch, messageFromApiJson } from './fetch';

export type CandidateFileItem = {
  attachingFileSeq?: number;
  targetSeq?: number;
  memberSeq?: number;
  fileOriginalName: string;
  fileSize: number;
  filePath: string;
  fileExtensionName?: string;
  delYn?: boolean;
};

export type Candidate = {
  candidateSeq: number;
  topicSeq: number;
  memberSeq: number | null;
  name: string;
  info: string | null;
  price: number | null;
  pickDate: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  fixed: boolean;
  fileList?: CandidateFileItem[];
};

function parseFileUploadLikeResponse(json: unknown): FileUploadResult | null {
  const root = json as { code?: string; data?: unknown };
  if (root?.code !== 'SUC001' || root.data == null || typeof root.data !== 'object') {
    return null;
  }
  const d = root.data as Record<string, unknown>;
  const filePath = typeof d.filePath === 'string' ? d.filePath.trim() : '';
  if (!filePath) return null;
  return {
    fileOriginalName:
      typeof d.fileOriginalName === 'string' ? d.fileOriginalName : String(d.fileOriginalName ?? ''),
    fileSize: typeof d.fileSize === 'number' ? d.fileSize : Number(d.fileSize) || 0,
    filePath,
    fileExtensionName:
      typeof d.fileExtensionName === 'string' ? d.fileExtensionName : String(d.fileExtensionName ?? ''),
  };
}

export async function scrapeCandidateImage(url: string): Promise<FileUploadResult> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new Error('이미지 추출에 사용할 URL을 입력해 주세요.');
  }

  const res = await apiFetch('/api/candidate/scrape-image', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: trimmedUrl }),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(messageFromApiJson(json, `대표 이미지 추출 실패 (${res.status})`));
  }
  if (json?.code !== 'SUC001') {
    throw new Error(messageFromApiJson(json, '대표 이미지 추출에 실패했습니다.'));
  }

  const parsed = parseFileUploadLikeResponse(json);
  if (!parsed) {
    throw new Error('대표 이미지 추출 응답에서 filePath를 찾을 수 없습니다.');
  }
  return parsed;
}

export type CandidateListRequest = {
  memberSeq: number;
  topicSeq: number;
  currentPage?: number;
};

function parseCandidateFileList(raw: unknown): CandidateFileItem[] {
  if (!Array.isArray(raw)) return [];
  const list: CandidateFileItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (r.delYn === true) continue;
    const filePath = typeof r.filePath === 'string' ? r.filePath.trim() : '';
    if (!filePath) continue;
    list.push({
      attachingFileSeq: typeof r.attachingFileSeq === 'number' ? r.attachingFileSeq : undefined,
      targetSeq: typeof r.targetSeq === 'number' ? r.targetSeq : undefined,
      memberSeq: typeof r.memberSeq === 'number' ? r.memberSeq : undefined,
      fileOriginalName: String(r.fileOriginalName ?? ''),
      fileSize: typeof r.fileSize === 'number' ? r.fileSize : Number(r.fileSize) || 0,
      filePath,
      fileExtensionName: typeof r.fileExtensionName === 'string' ? r.fileExtensionName : undefined,
      delYn: Boolean(r.delYn),
    });
  }
  return list;
}

function resolveCandidateImageUrl(
  imageUrl: string | null,
  fileList: CandidateFileItem[],
): string | null {
  const firstFile = fileList[0];
  if (firstFile?.filePath) {
    return resolveFilePathToUrl(firstFile.filePath);
  }
  if (imageUrl?.trim()) {
    const url = imageUrl.trim();
    return /^https?:\/\//i.test(url) ? url : resolveFilePathToUrl(url);
  }
  return null;
}

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

  const pickDateRaw = row?.pickDate ?? row?.pick_date ?? row?.PICK_DATE ?? null;
  const pickDate =
    typeof pickDateRaw === 'string' && pickDateRaw.trim()
      ? pickDateRaw.trim()
      : pickDateRaw instanceof Date
        ? pickDateRaw.toISOString()
        : null;

  const fileList = parseCandidateFileList(row?.fileList);
  const rawImageUrl =
    typeof row?.imageUrl === 'string' && row.imageUrl.trim() ? row.imageUrl.trim() : null;

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
    pickDate,
    imageUrl: resolveCandidateImageUrl(rawImageUrl, fileList),
    linkUrl: typeof row?.linkUrl === 'string' && row.linkUrl.trim() ? row.linkUrl.trim() : null,
    fixed: Boolean(row?.fixed),
    fileList,
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
    throw new Error(messageFromApiJson(json, `후보 조회 실패 (${res.status})`));
  }
  if (json?.code !== 'SUC001') {
    throw new Error(messageFromApiJson(json, '후보 조회에 실패했습니다.'));
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
  pickDate?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  fileList?: CandidateFileItem[];
  candidateSeq?: number;
  fixed?: boolean;
};

function buildSaveBody(data: SaveCandidateRequest) {
  const body: Record<string, unknown> = {
    memberSeq: data.memberSeq,
    fileList: data.fileList ?? [],
    topicSeq: data.topicSeq,
    name: data.name.trim(),
    info: data.info?.trim() ? data.info.trim() : null,
    price: data.price != null && Number.isFinite(data.price) ? data.price : null,
    imageUrl: data.imageUrl?.trim() ? data.imageUrl.trim() : null,
    linkUrl: data.linkUrl?.trim() ? data.linkUrl.trim() : null,
    pickDate: data.pickDate ?? null,
    fixed: data.fixed ?? false,
  };
  if (data.candidateSeq != null && Number.isFinite(data.candidateSeq)) {
    body.candidateSeq = data.candidateSeq;
  }
  return body;
}

export async function createCandidate(data: SaveCandidateRequest): Promise<Candidate> {
  const res = await apiFetch('/api/candidate', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSaveBody(data)),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(messageFromApiJson(json, `후보 등록 실패 (${res.status})`));
  }
  if (json?.code && json.code !== 'SUC001') {
    throw new Error(messageFromApiJson(json, '후보 등록에 실패했습니다.'));
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
    pickDate: data.pickDate ?? null,
    imageUrl: data.imageUrl?.trim() || null,
    linkUrl: data.linkUrl?.trim() || null,
    fixed: false,
  };
}

export async function updateCandidate(
  candidateSeq: number,
  data: SaveCandidateRequest,
): Promise<Candidate> {
  // 안건 수정과 동일: PUT /api/candidate + body에 candidateSeq
  const res = await apiFetch('/api/candidate', {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSaveBody({ ...data, candidateSeq })),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(messageFromApiJson(json, `후보 수정 실패 (${res.status})`));
  }
  if (json?.code && json.code !== 'SUC001') {
    throw new Error(messageFromApiJson(json, '후보 수정에 실패했습니다.'));
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
    pickDate: data.pickDate ?? null,
    imageUrl: data.imageUrl?.trim() || null,
    linkUrl: data.linkUrl?.trim() || null,
    fixed: data.fixed ?? false,
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
    throw new Error(messageFromApiJson(json, `후보 목록 조회 실패 (${res.status})`));
  }
  if (json?.code !== 'SUC001') {
    throw new Error(messageFromApiJson(json, '후보 목록 조회에 실패했습니다.'));
  }

  return parseCandidateListResponse(json);
}

export function formatCandidatePrice(price: number | null): string {
  if (price == null || !Number.isFinite(price)) return '가격 미정';
  return `${price.toLocaleString('ko-KR')}원`;
}

function hasExplicitTimezone(raw: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw.trim());
}

/** API 문자열에서 날짜·시각 숫자 추출 (입력한 시·분 유지) */
function parsePickDateParts(pickDate: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} | null {
  const raw = pickDate.trim().replace(/\.\d{3}(?=(?:Z|[+-]|$))/, '');

  // Z 또는 +09:00 이 있으면 로컬 시각으로 해석 (레거시 응답 대비)
  if (hasExplicitTimezone(raw)) {
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return null;
    return {
      year: dt.getFullYear(),
      month: dt.getMonth() + 1,
      day: dt.getDate(),
      hour: dt.getHours(),
      minute: dt.getMinutes(),
    };
  }

  // LocalDateTime: 2026-06-04T19:00:00 — 적힌 숫자 그대로 사용
  const wallClock =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?/.exec(raw);
  if (wallClock) {
    return {
      year: Number(wallClock[1]),
      month: Number(wallClock[2]),
      day: Number(wallClock[3]),
      hour: Number(wallClock[4]),
      minute: Number(wallClock[5]),
    };
  }

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return {
    year: dt.getFullYear(),
    month: dt.getMonth() + 1,
    day: dt.getDate(),
    hour: dt.getHours(),
    minute: dt.getMinutes(),
  };
}

export function formatCandidatePickDate(pickDate: string | null): string {
  if (!pickDate?.trim()) return '날짜 미정';
  const parts = parsePickDateParts(pickDate);
  if (!parts) return pickDate;
  const dt = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return dt.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 후보 카드 — pickDate 우선, 없으면 price */
export function formatCandidatePriceOrDate(candidate: Pick<Candidate, 'price' | 'pickDate'>): string {
  if (candidate.pickDate?.trim()) return formatCandidatePickDate(candidate.pickDate);
  return formatCandidatePrice(candidate.price);
}

/**
 * YYYY-MM-DD + HH:MM → PICK_DATE (java.time.LocalDateTime)
 * 백엔드는 타임존 없는 `2026-06-04T19:00:00` 형식만 받습니다. (+09:00 / Z 불가)
 * toISOString()은 UTC로 바뀌므로 사용하지 않고, 입력한 시·분을 그대로 넣습니다.
 */
export function buildPickDateIso(dateText: string, timeText: string): string | null {
  const d = dateText.trim();
  if (!d) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!dateMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeText.trim() || '00:00');
  const hour = timeMatch ? Number(timeMatch[1]) : 0;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
}

export function parsePickDateToForm(pickDate: string | null): { dateText: string; timeText: string } {
  if (!pickDate?.trim()) {
    return { dateText: '', timeText: '' };
  }
  const parts = parsePickDateParts(pickDate);
  if (!parts) {
    return { dateText: '', timeText: '' };
  }
  return {
    dateText: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
    timeText: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`,
  };
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

/** 최종 Pick (신규 스펙) — /api/candidate/{candidateSeq}/pick */
export async function pickCandidateBySeq(candidateSeq: number): Promise<void> {
  const res = await apiFetch(`/api/candidate/${candidateSeq}/pick`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ candidateSeq }),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `Pick 처리 실패 (${res.status})`);
  }
  if (json?.code && json.code !== 'SUC001') {
    throw new Error(json?.message ?? 'Pick 처리에 실패했습니다.');
  }
}
