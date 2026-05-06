import { Image, Pressable, Text, View } from "react-native";
import { homeStyles as s } from "./styles";

export type ReadingBook = {
  title: string;
  author: string;
  coverUrl?: string;
  pageCount?: number | null;
  /** ISO date the user started this book */
  dateStarted?: string;
};

function daysAgo(iso: string): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const start = new Date(y, m - 1, d).getTime();
  const today = new Date();
  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  return Math.max(0, Math.round((todayMid - start) / 86400000));
}

export function CurrentlyReading({
  book,
  onPress,
}: {
  book: ReadingBook;
  onPress?: () => void;
}) {
  const days = book.dateStarted ? daysAgo(book.dateStarted) : null;
  return (
    <Pressable style={s.bookCard} onPress={onPress}>
      {book.coverUrl ? (
        <Image
          source={{ uri: book.coverUrl }}
          style={[s.bookCover, { backgroundColor: "#26405e" }]}
          resizeMode="cover"
        />
      ) : (
        <View style={s.bookCover}>
          <Text style={s.bookCoverTitle}>{book.title.toLowerCase()}</Text>
          <Text style={s.bookCoverAuthor}>
            {(book.author.split(" ").slice(-1)[0] || "").toUpperCase()}
          </Text>
        </View>
      )}

      <View style={s.bookBody}>
        <View>
          <Text style={s.bookTitle} numberOfLines={2}>
            {book.title}
          </Text>
          {book.author ? <Text style={s.bookAuthor}>{book.author}</Text> : null}
        </View>

        <View style={s.bookMeta}>
          {days !== null && (
            <Text style={s.bookMetaText}>
              {days === 0
                ? "started today"
                : days === 1
                  ? "started yesterday"
                  : `${days} days in`}
            </Text>
          )}
          {days !== null && book.pageCount ? (
            <Text style={s.bookMetaDot}>·</Text>
          ) : null}
          {book.pageCount ? (
            <Text style={s.bookMetaText}>{book.pageCount} pages</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
