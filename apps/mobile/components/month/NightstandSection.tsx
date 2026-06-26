import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { BookEntry } from "@spine/shared";
import { monthStyles as m } from "./styles";

interface Props {
  reading: BookEntry[];
  upNext: BookEntry[];
  finishedThisMonth: BookEntry[];
}

function BookLine({ book }: { book: BookEntry }) {
  const router = useRouter();
  return (
    <Pressable
      style={m.bookRow}
      onPress={() => router.push(`/book/${book.id}`)}
    >
      <Text style={m.bookRowTitle} numberOfLines={1}>
        {book.title}
      </Text>
      {book.author ? (
        <Text style={m.bookRowAuthor} numberOfLines={1}>
          {book.author}
        </Text>
      ) : null}
      {book.moodTags.length > 0 && (
        <Text style={m.bookRowMeta} numberOfLines={1}>
          {book.moodTags.slice(0, 2).join(" · ")}
        </Text>
      )}
      {book.rating > 0 && (
        <Text style={m.stars}>{"★".repeat(Math.round(book.rating))}</Text>
      )}
    </Pressable>
  );
}

export function NightstandSection({
  reading,
  upNext,
  finishedThisMonth,
}: Props) {
  return (
    <>
      <View style={m.sectionWrap}>
        <Text style={m.sectionLabel}>on the nightstand</Text>
        {reading.length === 0 ? (
          <Text style={m.emptyLine}>nothing in progress.</Text>
        ) : (
          reading.map((b) => <BookLine key={b.id} book={b} />)
        )}
      </View>

      {upNext.length > 0 && (
        <View style={m.sectionWrap}>
          <Text style={m.sectionLabel}>up next on the nightstand</Text>
          {upNext.map((b) => (
            <BookLine key={b.id} book={b} />
          ))}
        </View>
      )}

      {finishedThisMonth.length > 0 && (
        <View style={m.sectionWrap}>
          <Text style={m.sectionLabel}>finished this month</Text>
          {finishedThisMonth.map((b) => (
            <BookLine key={b.id} book={b} />
          ))}
        </View>
      )}
    </>
  );
}
