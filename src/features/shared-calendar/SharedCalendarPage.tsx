import React from 'react';
import { SharedCalendarView } from './SharedCalendarView';
import type { AppUser } from '../../types/user';

interface SharedCalendarPageProps {
  currentUser: AppUser;
}

export function SharedCalendarPage({ currentUser }: SharedCalendarPageProps) {
  return (
    <div className="w-full h-full min-h-0 overflow-hidden">
      <SharedCalendarView currentUser={currentUser} />
    </div>
  );
}
