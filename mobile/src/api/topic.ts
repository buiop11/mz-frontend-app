import { resolveBackendApiRoot } from './category';
import { apiFetch } from './fetch';

export type TopicTagVariant = 'mint' | 'neutral';

export type TopicSummary = {
  topicSeq: string;
  memberSeq?: string;
  categorySeq?: string;
  candidateSeq?: string;
  categoryName?: string;
  title: string;
  sub: string;
  tag: string;
  tagVariant: TopicTagVariant;
  emoji: string;
  status: string;
  googleEventId?: string;
  href: string;
};

export type TopicParseResult = {
  list: TopicSummary[];
  fromApi: boolean;
  totalCount?: number;
  pageNum?: number;
  pageSize?: number;
  pages?: number;
  hasNextPage?: boolean;
};

export type PickTopicLogItem = {
  topicSeq: string;
  memberSeq?: string;
  categorySeq?: string;
  categoryName?: string;
  candidateSeq?: string;
  emoji: string;
  title: string;
  status: string;
  picked: boolean;
  googleEventId?: string;
  updateDt?: string;
  candidateName?: string;
  candidateInfo?: string;
  candidatePrice?: number;
  pickDate?: string;
  imageUrl?: string;
  linkUrl?: string;
  fixed?: boolean;
  proposerMemberSeq?: string;
};

export type TopicListRequest = {
  memberSeq: number;
  currentPage?: number;
  categorySeq?: number;
  picked?: boolean;
};

export const FALLBACK_TOPICS: TopicSummary[] = [
  {
    topicSeq: 'studio',
    memberSeq: '-1',
    categorySeq: '-1',
    candidateSeq: '-1',
    categoryName: '예시',
    title: '스튜디오 예약',
    sub: '후보 4 · 댓글 12 · 마감 D-2',
    tag: '투표 중',
    tagVariant: 'mint',
    emoji: '🍼',
    status: 'VOTING',
    href: '/vote/studio',
  },
  {
    topicSeq: 'invite',
    memberSeq: '-1',
    categorySeq: '-1',
    candidateSeq: '-1',
    categoryName: '예시',
    title: '식당 최종 선택',
    sub: 'Pick! ○○식당 · 2024.05.02',
    tag: 'Pick!',
    tagVariant: 'neutral',
    emoji: '💌',
    status: 'PICK',
    href: '/vote/invite',
  },
];

function optionalString(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
    case 'boolean':
      return String(value);
    default:
      return undefined;
  }
}

function optionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function isPickStatus(status: string) {
  return ['PICK', 'DONE', 'CONFIRMED', 'COMPLETED'].includes(status);
}

export type TopicFileItem = {
  memberSeq: number;
  fileOriginalName: string;
  fileSize: number;
  filePath: string;
  fileExtensionName: string;
  delYn?: boolean;
  attachingFileSeq?: number;
};

export type TopicSaveRequest = {
  memberSeq: number;
  categorySeq: number;
  title: string;
  emoji: string;
  status: string;
  googleEventId?: string | null;
  fileList?: TopicFileItem[];
};

export type TopicUpdateRequest = {
  memberSeq: number;
  topicSeq: number;
  emoji: string;
  title: string;
  googleEventId?: string | null;
};

export type TopicDetail = TopicSummary & {
  pickedCandidateSeq: number | null;
  fileList?: TopicFileItem[];
};

export function parseTopicDetailResponse(json: unknown, topicSeq: number): TopicDetail | null {
  const root = json as { code?: string; data?: unknown };
  if (root?.code !== 'SUC001' || root.data == null) return null;

  const row = normalizeTopicRow(
    typeof root.data === 'object' && !Array.isArray(root.data) ? root.data : { topicSeq },
  );
  const raw = root.data as Record<string, unknown>;
  const pickedRaw =
    raw.pickedCandidateSeq ?? raw.candidateSeq ?? raw.pickedSeq ?? row.candidateSeq ?? null;
  const pickedNum =
    typeof pickedRaw === 'number' ? pickedRaw : pickedRaw != null ? Number(pickedRaw) : NaN;

  const fileList = parseTopicFileList(raw.fileList);

  return {
    ...row,
    topicSeq: String(topicSeq),
    pickedCandidateSeq: Number.isFinite(pickedNum) && pickedNum > 0 ? pickedNum : null,
    fileList,
  };
}

function parseTopicFileList(raw: unknown): TopicFileItem[] {
  if (!Array.isArray(raw)) return [];
  const list: TopicFileItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const memberSeq =
      typeof r.memberSeq === 'number' ? r.memberSeq : Number(r.memberSeq);
    if (!Number.isFinite(memberSeq)) continue;
    list.push({
      memberSeq,
      fileOriginalName: String(r.fileOriginalName ?? ''),
      fileSize: typeof r.fileSize === 'number' ? r.fileSize : Number(r.fileSize) || 0,
      filePath: String(r.filePath ?? ''),
      fileExtensionName: String(r.fileExtensionName ?? ''),
      delYn: Boolean(r.delYn),
      attachingFileSeq:
        typeof r.attachingFileSeq === 'number' ? r.attachingFileSeq : undefined,
    });
  }
  return list;
}

function parseTopicSaveResponse(json: unknown, fallbackTopicSeq?: number): TopicDetail | null {
  const root = json as { code?: string; data?: unknown };
  if (root?.code !== 'SUC001' || root.data == null) return null;

  const data = root.data;
  if (typeof data === 'object' && !Array.isArray(data)) {
    const seqRaw = (data as Record<string, unknown>).topicSeq ?? fallbackTopicSeq;
    const seq =
      typeof seqRaw === 'number' ? seqRaw : Number.parseInt(String(seqRaw), 10);
    if (Number.isFinite(seq) && seq > 0) {
      return parseTopicDetailResponse(json, seq);
    }
  }

  const seqNum = typeof data === 'number' ? data : Number.parseInt(String(data), 10);
  if (Number.isFinite(seqNum) && seqNum > 0) {
    return parseTopicDetailResponse(
      { code: 'SUC001', data: { topicSeq: seqNum } },
      seqNum,
    );
  }
  return null;
}

export async function createTopic(data: TopicSaveRequest): Promise<TopicDetail> {
  const res = await apiFetch('/api/topic', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      memberSeq: data.memberSeq,
      fileList: data.fileList ?? [],
      categorySeq: data.categorySeq,
      emoji: data.emoji,
      title: data.title,
      status: data.status,
      googleEventId: data.googleEventId ?? null,
    }),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `안건 등록 실패 (${res.status})`);
  }
  if (json?.code !== 'SUC001') {
    throw new Error(json?.message ?? '안건 등록에 실패했습니다.');
  }

  const detail = parseTopicSaveResponse(json);
  if (!detail) {
    // 일부 환경에서 SUC001 + 빈 data({})로 응답하는 경우가 있어 등록 성공으로 간주한다.
    return {
      topicSeq: '0',
      memberSeq: String(data.memberSeq),
      categorySeq: String(data.categorySeq),
      candidateSeq: undefined,
      categoryName: undefined,
      title: data.title,
      sub: '',
      tag: defaultTagForStatus(data.status),
      tagVariant: resolveTagVariant(defaultTagForStatus(data.status), data.status, undefined),
      emoji: data.emoji,
      status: data.status,
      googleEventId: optionalString(data.googleEventId),
      href: '/list',
      pickedCandidateSeq: null,
      fileList: data.fileList ?? [],
    };
  }
  return detail;
}

export async function updateTopic(
  data: TopicUpdateRequest,
): Promise<TopicDetail> {
  const res = await apiFetch(`/api/topic`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      memberSeq: data.memberSeq,
      topicSeq: data.topicSeq,
      emoji: data.emoji,
      title: data.title,
      googleEventId: data.googleEventId ?? null,
    }),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `안건 수정 실패 (${res.status})`);
  }
  if (json?.code !== 'SUC001') {
    throw new Error(json?.message ?? '안건 수정에 실패했습니다.');
  }

  const detail = parseTopicSaveResponse(json, data.topicSeq);
  if (!detail) {
    throw new Error('안건 수정 응답을 해석할 수 없습니다.');
  }
  return detail;
}

export async function getTopicDetail(
  topicSeq: number,
  memberSeq?: number,
): Promise<TopicDetail | null> {
  const q =
    memberSeq != null ? `?memberSeq=${encodeURIComponent(String(memberSeq))}` : '';
  const path = `/api/topic/${topicSeq}${q}`;

  const res = await apiFetch(path, { method: 'GET', headers: { Accept: 'application/json' } });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `안건 상세 조회 실패 (${res.status})`);
  }
  if (json?.code !== 'SUC001') {
    throw new Error(json?.message ?? '안건 상세 조회에 실패했습니다.');
  }

  return parseTopicDetailResponse(json, topicSeq);
}

function defaultTagForStatus(status: string): string {
  if (isPickStatus(status)) return 'Pick!';
  if (['VOTING', 'IN_PROGRESS', 'OPEN'].includes(status)) return '투표 중';
  return '진행';
}

function resolveTagVariant(tag: string, status: string, rawVariant: unknown): TopicTagVariant {
  const tvRaw = (optionalString(rawVariant) ?? '').toLowerCase();
  if (tvRaw === 'neutral') return 'neutral';
  if (tvRaw === 'mint') return 'mint';
  return /pick/i.test(tag) || isPickStatus(status) ? 'neutral' : 'mint';
}

function resolveEmoji(item: any): string {
  const rawEmoji = item.emoji ?? item.emojiIcon ?? item.iconEmoji ?? item.topicEmoji ?? null;
  const emoji = optionalString(rawEmoji)?.trim();
  return emoji || '🗳️';
}

function resolveTopicHref(item: any, topicSeq: unknown): string {
  const existingHref = typeof item.href === 'string' ? item.href.trim() : '';
  if (existingHref) return existingHref;

  const topicSeqText = optionalString(topicSeq);
  if (topicSeqText && topicSeqText.length > 0) {
    return `/agenda/${encodeURIComponent(topicSeqText)}`;
  }
  if (typeof item.slug === 'string' && item.slug.trim()) {
    return `/agenda/${encodeURIComponent(item.slug.trim())}`;
  }
  return '/create';
}

function normalizeTopicSeq(topicSeq: unknown, href: string): string {
  return optionalString(topicSeq) ?? href;
}

export function normalizeTopicRow(item: any): TopicSummary {
  const topicSeq =
    item.topicSeq ?? item.topicId ?? item.id ?? item.agendaSeq ?? null;

  const title = String(
    item.title ?? item.topicTitle ?? item.name ?? item.agendaTitle ?? '',
  ).trim();
  const categoryName = String(item.categoryName ?? item.category ?? '').trim();

  const sub = String(
    item.sub ??
      item.subtitle ??
      item.description ??
      item.summary ??
      item.subText ??
      categoryName ??
      '',
  ).trim();

  const rawTag = String(
    item.tag ?? item.statusLabel ?? item.statusName ?? item.badge ?? '',
  ).trim();
  const status = String(item.status ?? '').toUpperCase();
  const tag = rawTag || defaultTagForStatus(status);
  const tagVariant = resolveTagVariant(tag, status, item.tagVariant);
  const emoji = resolveEmoji(item);
  const href = resolveTopicHref(item, topicSeq);

  return {
    topicSeq: normalizeTopicSeq(topicSeq, href),
    memberSeq: optionalString(item.memberSeq),
    categorySeq: optionalString(item.categorySeq),
    candidateSeq: optionalString(item.candidateSeq),
    categoryName: categoryName || undefined,
    title,
    sub: sub || categoryName,
    tag,
    tagVariant,
    emoji,
    status,
    googleEventId: optionalString(item.googleEventId),
    href,
  };
}

function normalizePickTopicLogRow(item: any): PickTopicLogItem | null {
  if (!item || typeof item !== 'object') return null;

  const topicSeq = optionalString(item.topicSeq ?? item.topicId ?? item.id);
  const title = String(item.title ?? '').trim();
  if (!topicSeq || !title) return null;

  return {
    topicSeq,
    memberSeq: optionalString(item.memberSeq),
    categorySeq: optionalString(item.categorySeq),
    categoryName: optionalString(item.categoryName ?? item.category),
    candidateSeq: optionalString(item.candidateSeq),
    emoji: resolveEmoji(item),
    title,
    status: String(item.status ?? '').toUpperCase(),
    picked: Boolean(item.picked) || isPickStatus(String(item.status ?? '').toUpperCase()),
    googleEventId: optionalString(item.googleEventId),
    updateDt: optionalString(item.updateDt),
    candidateName: optionalString(item.name),
    candidateInfo: optionalString(item.info),
    candidatePrice: optionalNumber(item.price),
    pickDate: optionalString(item.pickDate),
    imageUrl: optionalString(item.imageUrl),
    linkUrl: optionalString(item.linkUrl),
    fixed: typeof item.fixed === 'boolean' ? item.fixed : undefined,
    proposerMemberSeq: optionalString(item.proposerMemberSeq),
  };
}

export async function getPickTopicLogs(params: { memberSeq?: number } = {}): Promise<PickTopicLogItem[]> {
  const q = new URLSearchParams();
  if (params.memberSeq != null) q.set('memberSeq', String(params.memberSeq));
  const qs = q.toString();
  const path = qs ? `/api/topic/pick/list?${qs}` : '/api/topic/pick/list';

  const res = await apiFetch(path, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `Pick 로그 조회 실패 (${res.status})`);
  }
  if (json?.code !== 'SUC001') {
    throw new Error(json?.message ?? 'Pick 로그 조회에 실패했습니다.');
  }

  const arr = Array.isArray(json?.data) ? json.data : [];
  return arr
    .map((row: any) => normalizePickTopicLogRow(row))
    .filter((row: PickTopicLogItem | null): row is PickTopicLogItem => row != null)
    .filter((row: PickTopicLogItem) => row.picked || isPickStatus(row.status));
}

function rawTopicRowsFromData(data: any): any[] {
  const raw = data.list ?? data.topics ?? data.items ?? data.rows;
  return Array.isArray(raw) ? raw : [];
}

export function pickTopicSummaryForSeq(
  json: any,
  topicSeq: number | string,
): { title: string; sub: string } | null {
  if (json?.code !== 'SUC001' || json?.data == null || typeof json.data !== 'object') {
    return null;
  }
  const data = json.data;
  const arr = rawTopicRowsFromData(data);
  const want = String(topicSeq);

  if (arr.length > 0) {
    const rows = arr
      .map((row) => normalizeTopicRow(row))
      .filter((r) => r.title);
    const row = rows.find((r) => String(r.topicSeq) === want) ?? rows[0] ?? null;
    if (row?.title) return { title: row.title, sub: row.sub };
    return null;
  }

  const row = normalizeTopicRow(data);
  if (row.title) return { title: row.title, sub: row.sub };
  return null;
}

export function parseTopicApiResponse(json: any): TopicParseResult {
  // 응답 자체가 비정상(코드 다름/데이터 없음)일 때만 폴백 더미를 돌려준다.
  if (json?.code !== 'SUC001' || json?.data == null) {
    return { list: FALLBACK_TOPICS, fromApi: false };
  }

  const data = json.data;
  const raw = data.list ?? data.topics ?? data.items ?? data.rows;
  const arr = Array.isArray(raw) ? raw : [];
  const list = arr.map((row) => normalizeTopicRow(row)).filter((r) => r.title);

  // SUC001 + 빈 리스트는 "정상 응답이지만 안건이 0건"이므로 그대로 반환한다.
  // (예전엔 빈 리스트일 때 더미를 끼워 넣고 fromApi=false 로 처리해서, 화면에 에러도 빈 상태도 모두 표시되지 않는 버그가 있었다.)
  return {
    list,
    fromApi: true,
    totalCount: Number(data.totalCount ?? list.length),
    pageNum: Number(data.pageNum ?? 1),
    pageSize: Number(data.pageSize ?? (list.length || 10)),
    pages: Number(data.pages ?? (list.length > 0 ? 1 : 0)),
    hasNextPage: Boolean(data.hasNextPage),
  };
}

export async function getMemberTopics(params: TopicListRequest): Promise<TopicParseResult> {
  const q = new URLSearchParams({
    memberSeq: String(params.memberSeq),
    currentPage: String(params.currentPage ?? 1),
  });
  if (params.categorySeq != null) q.set('categorySeq', String(params.categorySeq));
  if (typeof params.picked === 'boolean') q.set('picked', String(params.picked));
  const path = `/api/topic?${q.toString()}`;

  console.info('[topic] GET', path);

  // 1단계: 네트워크 호출. 실패 시 apiFetch 가 이미 로그를 남기고 throw 하므로 여기서는 재포장만 한다.
  let res: Response;
  try {
    res = await apiFetch(path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch (e: any) {
    throw new Error(`/api/topic 네트워크 오류: ${e?.message ?? String(e)}`);
  }

  // 2단계: 바디를 텍스트로 먼저 읽고 JSON 파싱을 시도한다.
  //   - JSON이 아닐 때(HTML 에러 페이지/빈 응답 등)도 콘솔에서 원본을 확인할 수 있도록 raw text 를 보존한다.
  const rawText = await res.text().catch(() => '');
  let json: any = null;
  if (rawText) {
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      console.error('[topic] 응답이 JSON 아님', { status: res.status, rawText, parseError: e });
      throw new Error(`/api/topic 응답이 JSON이 아닙니다 (status=${res.status}). 본문 일부: ${rawText.slice(0, 200)}`);
    }
  }

  // 3단계: HTTP 상태 코드 체크.
  if (!res.ok) {
    console.error('[topic] HTTP 에러', { status: res.status, body: json ?? rawText });
    throw new Error(json?.message ?? `안건 목록 조회 실패 (status=${res.status})`);
  }

  // 4단계: 표준 응답 코드 체크.
  if (json?.code !== 'SUC001') {
    console.error('[topic] API 응답 코드 비정상', json);
    throw new Error(json?.message ?? `안건 목록 조회 실패 (code=${json?.code ?? 'unknown'})`);
  }

  const parsed = parseTopicApiResponse(json);
  console.info('[topic] parsed result', {
    count: parsed.list.length,
    totalCount: parsed.totalCount,
    fromApi: parsed.fromApi,
    pageNum: parsed.pageNum,
    pages: parsed.pages,
  });
  return parsed;
}

export async function getTopics(
  opts: { search?: Record<string, string | number> } = {},
): Promise<TopicParseResult> {
  const q = new URLSearchParams();
  const search = opts.search ?? { currentPage: 1 };
  for (const [k, v] of Object.entries(search)) {
    if (v != null && v !== '') q.set(k, String(v));
  }
  const qs = q.toString();
  const query = qs ? `?${qs}` : '';
  const url = `${resolveBackendApiRoot()}/api/topic${query}`;
  try {
    const res = await fetch(url, { headers: { Accept: '*/*' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return parseTopicApiResponse(json);
  } catch {
    return { list: FALLBACK_TOPICS, fromApi: false };
  }
}
