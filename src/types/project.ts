import type { Timestamp } from 'firebase/firestore';

export interface Project {
  id: string;
  name: string;
}

export interface ProjectDoc {
  name: string;
  createdAt: Timestamp;
  createdBy?: string;
}
