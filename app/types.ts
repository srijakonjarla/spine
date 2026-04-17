export type ReadingStatus =
  | "reading"
  | "finished"
  | "want-to-read"
  | "did-not-finish";

export interface Thought {
  id: string;
  text: string;
  pageNumber?: number | null;
  createdAt: string;
}

export interface BookRead {
  id: string;
  bookId: string;
  status: ReadingStatus;
  dateStarted: string;
  dateFinished: string;
  dateShelved: string;
  rating: number;
  feeling: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookEntry {
  id: string;
  catalogBookId: string;
  title: string;
  author: string;
  releaseDate: string;
  genres: string[];
  moodTags: string[];
  bookshelves: string[];
  status: ReadingStatus;
  dateStarted: string;
  dateFinished: string;
  dateShelved: string;
  rating: number;
  feeling: string;
  thoughts: Thought[];
  reads: BookRead[];
  bookmarked: boolean;
  coverUrl: string;
  isbn: string;
  pageCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  bookId: string | null;
  bookTitle?: string;
  text: string;
  pageNumber: string;
  createdAt: string;
}

export interface ReadingGoal {
  id: string;
  year: number;
  target: number;
  name: string;
  isAuto: boolean;
  bookIds: string[];
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
  price: string;
  type: string; // "bought" | "sold" | "donated" | ""
  sortOrder: number;
  createdAt: string;
  bookId?: string;
  coverUrl?: string;
}

export interface BookList {
  id: string;
  year: number;
  title: string;
  description: string;
  listType: string;
  color: string;
  emoji: string;
  bulletSymbol: string;
  dateLabel: string;
  notesLabel: string;
  sortOrder: number;
  items: ListItem[];
  bookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingLogEntry {
  id: string;
  logDate: string;
  note: string;
}
