import { useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  localDateStr,
  type BookEntry,
  type ReadingStatus,
} from "@spine/shared";
import { BookCoverThumb } from "@/components/library/BookCoverThumb";
import { InlineAdd } from "@/components/library/InlineAdd";
import { C, SERIF } from "@/components/login/tokens";
import { updateEntry, type CatalogEntry } from "@/lib/library";
import {
  addSeriesBook,
  deleteSeries,
  deleteSeriesBook,
  reorderSeriesBooks,
  updateSeries,
  updateSeriesBook,
  type Series,
  type SeriesBook,
} from "@/lib/series";

type SeriesStatus = SeriesBook["status"];

// Fallback cycle for a series book that isn't in the library.
const STATUS_CYCLE: Record<SeriesStatus, SeriesStatus> = {
  unread: "reading",
  reading: "read",
  read: "unread",
  skipped: "unread",
};

// A series book's status is its library entry's status.
const SERIES_STATUS: Record<ReadingStatus, SeriesStatus> = {
  "want-to-read": "unread",
  reading: "reading",
  finished: "read",
  "did-not-finish": "skipped",
};

const NEXT_LIBRARY_STATUS: Record<ReadingStatus, ReadingStatus> = {
  "want-to-read": "reading",
  reading: "finished",
  finished: "want-to-read",
  "did-not-finish": "want-to-read",
};

const LIBRARY_LABEL: Record<ReadingStatus, string> = {
  "want-to-read": "tbr",
  reading: "reading",
  finished: "read",
  "did-not-finish": "dnf",
};

const STATUS_COLOR: Record<SeriesStatus, string> = {
  read: C.sage,
  reading: C.terra,
  unread: C.fgFaint,
  skipped: C.fgFaint,
};

function matchLibraryBook(
  book: SeriesBook,
  library: BookEntry[],
): BookEntry | undefined {
  if (book.bookId) return library.find((b) => b.id === book.bookId);
  const t = book.title.toLowerCase();
  return library.find((b) => b.title.toLowerCase() === t);
}

function displayStatus(book: SeriesBook, lib: BookEntry | undefined) {
  return lib ? SERIES_STATUS[lib.status] : book.status;
}

export function SeriesCard({
  series,
  library,
  onChange,
  onDelete,
  onBookAdded,
  onLibraryBookUpdate,
}: {
  series: Series;
  library: BookEntry[];
  onChange: (next: Series) => void;
  onDelete: (id: string) => void;
  onBookAdded: () => void;
  onLibraryBookUpdate: (id: string, patch: Partial<BookEntry>) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(series.name);
  const [author, setAuthor] = useState(series.author);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = series.books.length;
  const readCount = series.books.filter(
    (b) => displayStatus(b, matchLibraryBook(b, library)) === "read",
  ).length;

  const handleFieldChange = (patch: { name?: string; author?: string }) => {
    if (patch.name !== undefined) setName(patch.name);
    if (patch.author !== undefined) setAuthor(patch.author);
    onChange({ ...series, ...patch });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () => updateSeries(series.id, patch).catch(() => {}),
      600,
    );
  };

  const handleAddBook = async (catalog?: CatalogEntry, raw?: string) => {
    const title = (catalog?.title ?? raw ?? "").trim();
    if (!title) return;
    const initialStatus: SeriesStatus | undefined =
      catalog?.status === "finished"
        ? "read"
        : catalog?.status === "reading"
          ? "reading"
          : undefined;
    try {
      const book = await addSeriesBook(
        series.id,
        title,
        total + 1,
        catalog
          ? {
              hardcoverBookId: catalog.hardcoverBookId,
              coverUrl: catalog.coverUrl,
              author: catalog.author,
              isbn: catalog.isbn,
              releaseDate: catalog.releaseDate,
              genres: catalog.genres,
              pageCount: catalog.pageCount,
              bookId: catalog.bookId,
            }
          : undefined,
        initialStatus,
      );
      onChange({
        ...series,
        books: [
          ...series.books,
          { ...book, coverUrl: catalog?.coverUrl ?? "" },
        ],
      });
      onBookAdded();
    } catch {
      Alert.alert("couldn't add book", "try again later.");
    }
  };

  const handleStatus = async (book: SeriesBook, lib: BookEntry | undefined) => {
    if (!lib) {
      const next = STATUS_CYCLE[book.status];
      onChange({
        ...series,
        books: series.books.map((b) =>
          b.id === book.id ? { ...b, status: next } : b,
        ),
      });
      updateSeriesBook(series.id, book.id, next).catch(() => {});
      return;
    }
    // Same date rules as changing status on the book page.
    const next = NEXT_LIBRARY_STATUS[lib.status];
    const patch: Partial<BookEntry> = { status: next };
    if (next === "reading" && !lib.dateStarted)
      patch.dateStarted = localDateStr();
    if (next === "finished" && !lib.dateFinished)
      patch.dateFinished = localDateStr();
    onLibraryBookUpdate(lib.id, patch);
    try {
      await updateEntry(lib.id, patch);
    } catch {
      onLibraryBookUpdate(lib.id, {
        status: lib.status,
        dateStarted: lib.dateStarted,
        dateFinished: lib.dateFinished,
      });
      Alert.alert("couldn't update the book", "try again later.");
    }
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= total) return;
    const books = [...series.books];
    [books[index], books[target]] = [books[target], books[index]];
    onChange({ ...series, books });
    reorderSeriesBooks(
      series.id,
      books.map((b) => b.id),
    ).catch(() => {});
  };

  const removeBook = (book: SeriesBook) => {
    onChange({
      ...series,
      books: series.books.filter((b) => b.id !== book.id),
    });
    deleteSeriesBook(series.id, book.id).catch(() => {});
  };

  const bookActions = (book: SeriesBook, index: number) => {
    Alert.alert(book.title, undefined, [
      ...(index > 0
        ? [{ text: "move up", onPress: () => move(index, -1) }]
        : []),
      ...(index < total - 1
        ? [{ text: "move down", onPress: () => move(index, 1) }]
        : []),
      {
        text: "remove from series",
        style: "destructive" as const,
        onPress: () => removeBook(book),
      },
      { text: "cancel", style: "cancel" as const },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert("delete series", `delete "${series.name || "this series"}"?`, [
      { text: "cancel", style: "cancel" },
      {
        text: "delete",
        style: "destructive",
        onPress: () => {
          onDelete(series.id);
          deleteSeries(series.id).catch(() =>
            Alert.alert("couldn't delete series", "try again later."),
          );
        },
      },
    ]);
  };

  return (
    <View style={s.card}>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <TextInput
            value={name}
            onChangeText={(v) => handleFieldChange({ name: v })}
            placeholder="series name"
            placeholderTextColor={C.fgFaint}
            style={s.name}
          />
          <TextInput
            value={author}
            onChangeText={(v) => handleFieldChange({ author: v })}
            placeholder="author"
            placeholderTextColor={C.fgFaint}
            style={s.author}
          />
        </View>
        <View style={s.headRight}>
          <Text style={s.count}>
            {readCount}/{total}
          </Text>
          <Pressable hitSlop={8} onPress={confirmDelete}>
            <Text style={s.delete}>delete</Text>
          </Pressable>
        </View>
      </View>

      {total > 0 ? (
        <View style={s.track}>
          <View
            style={[
              s.fill,
              { width: `${Math.round((readCount / total) * 100)}%` },
            ]}
          />
        </View>
      ) : null}

      <View style={{ gap: 4, marginBottom: 6 }}>
        {series.books.map((book, index) => {
          const lib = matchLibraryBook(book, library);
          const status = displayStatus(book, lib);
          const color = STATUS_COLOR[status];
          const linkedId = book.bookId ?? lib?.id ?? null;
          return (
            <Pressable
              key={book.id}
              onPress={() => linkedId && router.push(`/book/${linkedId}`)}
              onLongPress={() => bookActions(book, index)}
              style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.pos}>{index + 1}.</Text>
              <BookCoverThumb
                coverUrl={book.coverUrl || lib?.coverUrl}
                title={book.title}
                width={22}
                height={33}
              />
              <Pressable
                hitSlop={10}
                onPress={() => handleStatus(book, lib)}
                accessibilityLabel={
                  lib
                    ? `mark as ${LIBRARY_LABEL[NEXT_LIBRARY_STATUS[lib.status]]}`
                    : `mark as ${STATUS_CYCLE[book.status]}`
                }
                style={[
                  s.dot,
                  {
                    borderColor:
                      status === "unread" || status === "skipped"
                        ? C.line
                        : color,
                  },
                  status === "read" && { backgroundColor: color },
                ]}
              >
                {status === "reading" ? <View style={s.half} /> : null}
                {status === "read" ? <Text style={s.check}>✓</Text> : null}
              </Pressable>
              <Text
                numberOfLines={1}
                style={[
                  s.title,
                  status === "read" && { color: C.fgFaint },
                  status === "skipped" && {
                    textDecorationLine: "line-through",
                  },
                ]}
              >
                {book.title}
              </Text>
              {lib ? (
                <Text style={[s.badge, { color, borderColor: color }]}>
                  {LIBRARY_LABEL[lib.status]}
                </Text>
              ) : book.status !== "unread" ? (
                <Text style={[s.statusText, { color }]}>{book.status}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <InlineAdd
        placeholder={`book ${total + 1} title or isbn…`}
        onAdd={handleAddBook}
        libraryEntries={library}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 16,
    backgroundColor: C.paper,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  name: {
    fontFamily: SERIF,
    fontSize: 18,
    fontWeight: "600",
    color: C.fgHeading,
    padding: 0,
  },
  author: { fontSize: 12, color: C.fgMuted, padding: 0, marginTop: 2 },
  headRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  count: { fontSize: 12, color: C.fgFaint },
  delete: { fontSize: 12, color: C.fgFaint },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: C.paperDeep,
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 12,
  },
  fill: { height: "100%", backgroundColor: C.sage, borderRadius: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  pos: { width: 20, fontSize: 11, color: C.fgFaint },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  half: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "50%",
    backgroundColor: C.terra,
  },
  check: { fontSize: 10, color: C.white, fontWeight: "700" },
  title: { flex: 1, fontSize: 14, color: C.fg },
  badge: {
    fontSize: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  statusText: { fontSize: 11 },
});
