export type Participant = {
  id: string;
  name: string;
  goalHours?: number;
  studiedHours: number;
  comments: string[];
  // Monday-first: [월, 화, 수, 목, 금, 토, 일]
  dailyHours?: number[];
};

export type GiftRecord = {
  id: string;
  weekKey: string;
  from: string;
  to: string;
  createdAt: string;
};
