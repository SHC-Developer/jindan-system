export interface DailyJournalGoal {
  text: string;
  checked: boolean;
}

export interface DailyJournalDoc {
  id: string;
  userId: string;
  dateKey: string;
  goals: DailyJournalGoal[];
  detailContent: string;
  tomorrowPlan: string;
  memo: string;
  createdAt: number;
  updatedAt: number;
}

export interface DailyJournalListItem {
  dateKey: string;
  id: string;
}

export function createEmptyGoals(count: number): DailyJournalGoal[] {
  return Array.from({ length: count }, () => ({ text: '', checked: false }));
}
