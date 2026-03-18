export type ReadingStatus = "reading" | "finished" | "want-to-read" | "did-not-finish";

export interface Thought {
  id: string;
  text: string;
  createdAt: string;
}

export interface BookEntry {
  id: string;
  title: string;
  author: string;
  status: ReadingStatus;
  dateStarted: string;
  dateFinished: string;
  dateShelved: string;
  rating: number;
  feeling: string;
  thoughts: Thought[];
  createdAt: string;
  updatedAt: string;
}

export interface ListItem {
  id: string;
  listId: string;
  title: string;
  author: string;
  releaseDate: string;
  notes: string;
  sortOrder: number;
  createdAt: string;
}

export interface BookList {
  id: string;
  year: number;
  title: string;
  description: string;
  sortOrder: number;
  items: ListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReadingLogEntry {
  id: string;
  logDate: string;
  note: string;
}
