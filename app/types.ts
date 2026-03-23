export type ReadingStatus = "reading" | "finished" | "want-to-read" | "did-not-finish";

export interface Thought {
  id: string;
  text: string;
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
  title: string;
  author: string;
  genres: string[];
  status: ReadingStatus;
  dateStarted: string;
  dateFinished: string;
  dateShelved: string;
  rating: number;
  feeling: string;
  thoughts: Thought[];
  reads: BookRead[];
  bookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListItem {
  id: string;
  listId: string;
  catalogId: string;
  title: string;   // from book_catalog join
  author: string;  // from book_catalog join
  releaseDate: string;
  notes: string;
  price: string;
  type: string; // "bought" | "sold" | "donated" | ""
  sortOrder: number;
  createdAt: string;
}

export interface BookList {
  id: string;
  year: number;
  title: string;
  description: string;
  listType: string;
  dateLabel: string;   // empty = date field hidden
  notesLabel: string;  // label for the notes/annotation field
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
