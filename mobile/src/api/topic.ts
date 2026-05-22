import { resolveBackendApiRoot } from './category';

export type TopicTagVariant = 'mint' | 'neutral';

export type TopicSummary = {
  topicSeq: string;
  title: string;
  sub: string;
  tag: string;
  tagVariant: TopicTagVariant;
  emoji: string;
  href: string;
};

export type TopicParseResult = {
  list: TopicSummary[];
  fromApi: boolean;
};

export const FALLBACK_TOPICS: TopicSummary[] = [
  {
    topicSeq: 'studio',
    title: '스튜디오 예약',
    sub: '후보 4 · 댓글 12 · 마감 D-2',
    tag: '투표 중',
    tagVariant: 'mint',
    emoji: '🍼',
    href: '/vote/studio',
  },
  {
    topicSeq: 'invite',
    title: '식당 최종 선택',
    sub: '결정자: 아진 · 2024.05.02',
    tag: 'Pick!',
    tagVariant: 'neutral',
    emoji: '💌',
    href: '/vote/invite',
  },
];

export function normalizeTopicRow(item: any): TopicSummary {
  const topicSeq =
    item.topicSeq ?? item.topicId ?? item.id ?? item.agendaSeq ?? null;

  const title = String(
    item.title ?? item.topicTitle ?? item.name ?? item.agendaTitle ?? '',
  ).trim();

  const sub = String(
    item.sub ??
      item.subtitle ??
      item.description ??
      item.summary ??
      item.subText ??
      '',
  ).trim();

  let tag = String(
    item.tag ?? item.statusLabel ?? item.statusName ?? item.badge ?? '',
  ).trim();

  const status = String(item.status ?? '').toUpperCase();
  if (!tag) {
    if (
      status === 'PICK' ||
      status === 'DONE' ||
      status === 'CONFIRMED' ||
      status === 'COMPLETED'
    ) {
      tag = 'Pick!';
    } else if (
      status === 'VOTING' ||
      status === 'IN_PROGRESS' ||
      status === 'OPEN'
    ) {
      tag = '투표 중';
    } else {
      tag = '진행';
    }
  }

  const tvRaw = String(item.tagVariant ?? '').toLowerCase();
  let tagVariant: TopicTagVariant | null =
    tvRaw === 'neutral' || tvRaw === 'mint' ? (tvRaw as TopicTagVariant) : null;
  if (!tagVariant) {
    if (
      /pick/i.test(tag) ||
      status === 'PICK' ||
      status === 'DONE' ||
      status === 'CONFIRMED' ||
      status === 'COMPLETED'
    ) {
      tagVariant = 'neutral';
    } else {
      tagVariant = 'mint';
    }
  }

  const rawEmoji =
    item.emoji ?? item.emojiIcon ?? item.iconEmoji ?? item.topicEmoji ?? null;
  let emoji = '';
  if (typeof rawEmoji === 'string') {
    emoji = rawEmoji.trim();
  } else if (rawEmoji != null) {
    const s = String(rawEmoji).trim();
    if (s) emoji = s;
  }

  let href = typeof item.href === 'string' ? item.href.trim() : '';
  if (!href) {
    if (topicSeq != null && String(topicSeq).length > 0) {
      href = `/vote/${encodeURIComponent(String(topicSeq))}`;
    } else if (typeof item.slug === 'string' && item.slug.trim()) {
      href = `/vote/${encodeURIComponent(item.slug.trim())}`;
    } else {
      href = '/vote/new';
    }
  }

  return {
    topicSeq: topicSeq != null ? String(topicSeq) : href,
    title,
    sub,
    tag,
    tagVariant,
    emoji,
    href,
  };
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
  if (json?.code !== 'SUC001' || json?.data == null) {
    return { list: FALLBACK_TOPICS, fromApi: false };
  }

  const raw =
    json.data.list ?? json.data.topics ?? json.data.items ?? json.data.rows;
  const arr = Array.isArray(raw) ? raw : [];
  const list = arr.map((row) => normalizeTopicRow(row)).filter((r) => r.title);

  if (list.length === 0) {
    return { list: FALLBACK_TOPICS, fromApi: false };
  }

  return { list, fromApi: true };
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
  const url = `${resolveBackendApiRoot()}/api/topic${qs ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url, { headers: { Accept: '*/*' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return parseTopicApiResponse(json);
  } catch {
    return { list: FALLBACK_TOPICS, fromApi: false };
  }
}
