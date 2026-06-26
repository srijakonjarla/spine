import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  formatDate,
  parseLocalDate,
  type BookEntry,
  type Quote,
} from "@spine/shared";
import { SheetModal, sheetStyles } from "@/components/SheetModal";
import { RGB, alpha } from "@/components/login/tokens";
import { monthStyles as m } from "./styles";

const NOTE_SAVE_DELAY = 600;

interface Props {
  open: boolean;
  date: string | null;
  todayStr: string;
  initialNote: string;
  isLogged: boolean;
  started: BookEntry[];
  finished: BookEntry[];
  quotes: Quote[];
  onClose: () => void;
  onToggle: (date: string) => void;
  onNoteSave: (date: string, note: string) => void;
}

function dayHeading(iso: string, todayStr: string): string {
  if (iso === todayStr) return "today";
  const d = parseLocalDate(iso);
  if (!d) return "";
  const weekday = d
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  return `${weekday}`;
}

export function DayPanel({
  open,
  date,
  todayStr,
  initialNote,
  isLogged,
  started,
  finished,
  quotes,
  onClose,
  onToggle,
  onNoteSave,
}: Props) {
  const [note, setNote] = useState(initialNote);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote, date]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleNoteChange = (v: string) => {
    setNote(v);
    if (!date) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const captured = date;
    debounceRef.current = setTimeout(() => {
      onNoteSave(captured, v);
    }, NOTE_SAVE_DELAY);
  };

  const flushAndClose = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      if (date) onNoteSave(date, note);
    }
    onClose();
  };

  return (
    <SheetModal open={open} onClose={flushAndClose}>
      {date && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={m.panelHeader}>
            <View>
              <Text style={m.panelKicker}>{dayHeading(date, todayStr)}</Text>
              <Text style={m.panelDate}>{formatDate(date)}</Text>
            </View>
            <Pressable onPress={flushAndClose} hitSlop={12}>
              <Text style={m.panelClose}>×</Text>
            </Pressable>
          </View>

          <Pressable
            style={[m.toggleRow, isLogged && m.toggleRowOn]}
            onPress={() => onToggle(date)}
          >
            <View>
              <Text style={m.toggleLabel}>
                {isLogged ? "logged" : "log this day"}
              </Text>
              <Text style={m.toggleSub}>
                {isLogged
                  ? "counts toward your streak"
                  : "mark you read on this day"}
              </Text>
            </View>
            <View style={[m.pill, isLogged && m.pillOn]}>
              <Text style={[m.pillText, isLogged && m.pillTextOn]}>
                {isLogged ? "on" : "off"}
              </Text>
            </View>
          </Pressable>

          <Text style={m.noteLabel}>journal note</Text>
          <TextInput
            value={note}
            onChangeText={handleNoteChange}
            multiline
            placeholder="what did you read today?"
            placeholderTextColor={alpha(RGB.plum, 0.35)}
            style={m.noteInput}
          />

          {finished.length > 0 && (
            <>
              <Text style={m.panelSubLabel}>finished</Text>
              {finished.map((b) => (
                <Text key={b.id} style={m.panelLine} numberOfLines={1}>
                  ✦ {b.title}
                  {b.author ? ` · ${b.author}` : ""}
                </Text>
              ))}
            </>
          )}

          {started.length > 0 && (
            <>
              <Text style={m.panelSubLabel}>started</Text>
              {started.map((b) => (
                <Text key={b.id} style={m.panelLine} numberOfLines={1}>
                  {b.title}
                  {b.author ? ` · ${b.author}` : ""}
                </Text>
              ))}
            </>
          )}

          {quotes.length > 0 && (
            <>
              <Text style={m.panelSubLabel}>quotes saved</Text>
              {quotes.map((q) => (
                <View key={q.id} style={[m.quoteRow, { marginBottom: 8 }]}>
                  <Text style={m.quoteText} numberOfLines={3}>
                    “{q.text}”
                  </Text>
                  {(q.bookTitle || q.pageNumber) && (
                    <Text style={m.quoteMeta}>
                      {q.bookTitle ?? ""}
                      {q.bookTitle && q.pageNumber ? " · " : ""}
                      {q.pageNumber ? `p. ${q.pageNumber}` : ""}
                    </Text>
                  )}
                </View>
              ))}
            </>
          )}

          {finished.length === 0 &&
            started.length === 0 &&
            quotes.length === 0 && (
              <Text style={[sheetStyles.subtitle, { marginTop: 12 }]}>
                no books or quotes on this day yet.
              </Text>
            )}
        </ScrollView>
      )}
    </SheetModal>
  );
}
