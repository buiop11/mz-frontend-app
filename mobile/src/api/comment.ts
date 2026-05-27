import { apiFetch } from './fetch';

export type Comment = {
  commentSeq: number;
  candidateSeq: number;
  memberSeq: number | null;
  authorName: string;
  content: string;
};

export type CommentListRequest = {
  memberSeq: number;
  candidateSeq: number;
  currentPage?: number;
};

function normalizeComment(row: unknown): Comment | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const commentSeq =
    typeof r.commentSeq === 'number' ? r.commentSeq : Number(r.commentSeq);
  const candidateSeq =
    typeof r.candidateSeq === 'number' ? r.candidateSeq : Number(r.candidateSeq);
  if (!Number.isFinite(commentSeq) || commentSeq <= 0) return null;
  if (!Number.isFinite(candidateSeq) || candidateSeq <= 0) return null;

  const content = typeof r.content === 'string' ? r.content.trim() : '';
  const text = content || (typeof r.comment === 'string' ? r.comment.trim() : '');
  if (!text) return null;

  const authorName =
    (typeof r.authorName === 'string' && r.authorName.trim()) ||
    (typeof r.memberName === 'string' && r.memberName.trim()) ||
    (typeof r.name === 'string' && r.name.trim()) ||
    '회원';

  return {
    commentSeq,
    candidateSeq,
    memberSeq:
      typeof r.memberSeq === 'number'
        ? r.memberSeq
        : r.memberSeq != null
          ? Number(r.memberSeq)
          : null,
    authorName,
    content: text,
  };
}

export function parseCommentListResponse(json: unknown): Comment[] {
  const root = json as { code?: string; data?: unknown };
  if (root?.code !== 'SUC001') return [];
  const data = root.data;
  const arr = Array.isArray(data) ? data : Array.isArray((data as { list?: unknown })?.list) ? (data as { list: unknown[] }).list : [];
  const list: Comment[] = [];
  for (const row of arr) {
    const item = normalizeComment(row);
    if (item) list.push(item);
  }
  return list;
}

export async function getCommentList(params: CommentListRequest): Promise<Comment[]> {
  const q = new URLSearchParams({
    memberSeq: String(params.memberSeq),
    candidateSeq: String(params.candidateSeq),
    currentPage: String(params.currentPage ?? 1),
  });
  const path = `/api/comment/list?${q.toString()}`;

  const res = await apiFetch(path, { method: 'GET', headers: { Accept: 'application/json' } });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `댓글 조회 실패 (${res.status})`);
  }
  if (json?.code !== 'SUC001') {
    throw new Error(json?.message ?? '댓글 조회에 실패했습니다.');
  }

  return parseCommentListResponse(json);
}

export type CreateCommentRequest = {
  memberSeq: number;
  candidateSeq: number;
  content: string;
};

export async function createComment(params: CreateCommentRequest): Promise<Comment> {
  const res = await apiFetch('/api/comment', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      memberSeq: params.memberSeq,
      candidateSeq: params.candidateSeq,
      content: params.content.trim(),
    }),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `댓글 등록 실패 (${res.status})`);
  }
  if (json?.code && json.code !== 'SUC001') {
    throw new Error(json?.message ?? '댓글 등록에 실패했습니다.');
  }

  const parsed = normalizeComment(json?.data ?? json);
  if (parsed) return parsed;

  return {
    commentSeq: Date.now(),
    candidateSeq: params.candidateSeq,
    memberSeq: params.memberSeq,
    authorName: '나',
    content: params.content.trim(),
  };
}
