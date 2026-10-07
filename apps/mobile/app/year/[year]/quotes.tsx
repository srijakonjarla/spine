import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Quote } from "@spine/shared";
import { homeStyles as h } from "@/components/home";
import { C, SERIF } from "@/components/login/tokens";
import { BackBar, EmptyHint, ScreenHeader } from "@/components/ui/ScreenHeader";
import { useYearData } from "@/lib/useYearData";
import { deleteQuote } from "@/lib/library";

export default function YearQuotesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ year: string }>();
  const year = Number(params.year) || new Date().getFullYear();
  const { loading, error, quotes: loaded } = useYearData(year);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => setQuotes(loaded), [loaded]);

  const confirmDelete = (q: Quote) => {
    Alert.alert("delete quote", "this can't be undone.", [
      { text: "cancel", style: "cancel" },
      {
        text: "delete",
        style: "destructive",
        onPress: () => {
          const prev = quotes;
          setQuotes((qs) => qs.filter((x) => x.id !== q.id));
          deleteQuote(q.id).catch(() => {
            setQuotes(prev);
            Alert.alert("couldn't delete quote", "try again later.");
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={h.safe} edges={["top"]}>
      <BackBar label={String(year)} />
      <ScrollView
        style={h.scroll}
        contentContainerStyle={h.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow={`reading journal · ${year}`}
          title="quote collection"
          subtitle={loading ? undefined : `${quotes.length} saved`}
        />
        {loading ? (
          <ActivityIndicator color={C.fgMuted} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={s.error}>couldn&apos;t load. {error}</Text>
        ) : quotes.length === 0 ? (
          <EmptyHint>
            no quotes saved yet — add them from any book page.
          </EmptyHint>
        ) : (
          <View style={{ gap: 28 }}>
            {quotes.map((q) => (
              <Pressable
                key={q.id}
                onPress={() => q.bookId && router.push(`/book/${q.bookId}`)}
                onLongPress={() => confirmDelete(q)}
                style={({ pressed }) => [s.quote, pressed && { opacity: 0.7 }]}
              >
                <Text style={s.text}>“{q.text}”</Text>
                {q.bookTitle || q.pageNumber ? (
                  <Text style={s.meta}>
                    — {q.bookTitle ?? ""}
                    {q.bookTitle && q.pageNumber ? " · " : ""}
                    {q.pageNumber ? `p. ${q.pageNumber}` : ""}
                  </Text>
                ) : null}
              </Pressable>
            ))}
            <Text style={s.hint}>long-press a quote to delete it.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  error: { color: C.danger, paddingVertical: 16 },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: C.lavender,
    paddingLeft: 16,
    paddingVertical: 2,
  },
  text: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 17,
    lineHeight: 26,
    color: C.fg,
  },
  meta: { fontSize: 12, color: C.fgMuted, marginTop: 8 },
  hint: { fontSize: 11, color: C.fgFaint, textAlign: "center" },
});
