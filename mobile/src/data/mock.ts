export type Category = {
  id: string;
  emoji: string;
  label: string;
};

export type AgendaStatus = 'VOTING' | 'CONFIRMED' | 'PICKED';

export type Candidate = {
  id: string;
  title: string;
  subtitle?: string;
  priceText?: string;
  badgeText?: string;
  description?: string;
  tags?: string[];
};

export type Agenda = {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string;
  status: AgendaStatus;
  commentCount: number;
  candidates: Candidate[];
  scheduledAt?: string; // ISO string
  pickedCandidateId?: string;
};

export const categories: Category[] = [
  { id: 'wedding', emoji: '💍', label: '웨딩' },
  { id: 'meal', emoji: '🍽️', label: '식사' },
  { id: 'buy', emoji: '🛒', label: '구매' },
  { id: 'date', emoji: '🌷', label: '데이트' },
];

export const agendas: Agenda[] = [
  {
    id: 'a1',
    categoryId: 'wedding',
    title: '청첩장 후보',
    subtitle: '디자인 3개 중 최종 결정',
    status: 'VOTING',
    commentCount: 4,
    scheduledAt: '2026-05-14T15:00:00+09:00',
    candidates: [
      {
        id: 'c1',
        badgeText: 'NEW',
        title: '심플 미니멀 타입',
        subtitle: '화이트 · 세련된 타이포',
        priceText: '45,000원',
        description:
          '미니멀한 타이포 중심의 청첩장. 군더더기 없이 깔끔하고, 인쇄 옵션이 다양합니다.',
        tags: ['링크', '무료배송'],
      },
      {
        id: 'c2',
        title: '파스텔 플로럴',
        subtitle: '파스텔 톤 · 따뜻한 분위기',
        priceText: '52,000원',
        description:
          '파스텔 플로럴 일러스트가 들어간 청첩장. 사진 없이도 분위기가 살아납니다.',
        tags: ['인기'],
      },
      {
        id: 'c3',
        title: '포토 카드형',
        subtitle: '사진 1장 · 인화 느낌',
        priceText: '48,000원',
        description:
          '한 장짜리 포토 카드형. 심플하지만 임팩트가 있고, 비용도 합리적입니다.',
        tags: ['가성비'],
      },
    ],
  },
  {
    id: 'a2',
    categoryId: 'meal',
    title: '이번 주 외식',
    subtitle: '토요일 저녁 어디 갈까?',
    status: 'CONFIRMED',
    commentCount: 1,
    candidates: [
      { id: 'c1', title: '스시 오마카세', subtitle: '2인 코스', priceText: '140,000원' },
      { id: 'c2', title: '파스타 & 와인', subtitle: '캐주얼', priceText: '80,000원' },
    ],
  },
  {
    id: 'a3',
    categoryId: 'buy',
    title: '유모차 구매',
    subtitle: '휴대형 vs 디럭스',
    status: 'PICKED',
    commentCount: 9,
    pickedCandidateId: 'c2',
    candidates: [
      { id: 'c1', title: '휴대형 A', subtitle: '가벼움', priceText: '320,000원' },
      { id: 'c2', title: '디럭스 B', subtitle: '승차감', priceText: '590,000원' },
    ],
  },
];

export const getAgendaById = (id: string) => agendas.find((a) => a.id === id);
