import { Text, View } from "react-native";
import type { Quote } from "@spine/shared";
import { monthStyles as m } from "./styles";

interface Props {
  quotes: Quote[];
}

export function QuotesSection({ quotes }: Props) {
  return (
    <View style={m.sectionWrap}>
      <Text style={m.sectionLabel}>
        saved quotes{quotes.length > 0 ? ` · ${quotes.length}` : ""}
      </Text>
      {quotes.length === 0 ? (
        <Text style={m.emptyLine}>no quotes saved this month.</Text>
      ) : (
        quotes.slice(0, 5).map((q) => (
          <View key={q.id} style={m.quoteRow}>
            <Text style={m.quoteText}>“{q.text}”</Text>
            {(q.bookTitle || q.pageNumber) && (
              <Text style={m.quoteMeta}>
                {q.bookTitle ?? ""}
                {q.bookTitle && q.pageNumber ? " · " : ""}
                {q.pageNumber ? `p. ${q.pageNumber}` : ""}
              </Text>
            )}
          </View>
        ))
      )}
    </View>
  );
}
