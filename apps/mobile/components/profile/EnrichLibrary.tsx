import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { profileWidgetStyles as s } from "./InviteFriend";

type State = "idle" | "running" | "done" | "error";

/** Kicks off the server-side Hardcover backfill and polls its progress. */
export function EnrichLibrary() {
  const [state, setState] = useState<State>("idle");
  const [total, setTotal] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const checkProgress = async () => {
    try {
      const res = await apiFetch("/api/admin/backfill");
      const { remaining: rem, running } = await res.json();
      setRemaining(rem);
      if (!running) {
        stopPolling();
        setState("done");
      }
    } catch {
      // transient — keep polling
    }
  };

  const start = async () => {
    try {
      setState("running");
      const res = await apiFetch("/api/admin/backfill", { method: "POST" });
      const { total: t } = await res.json();
      setTotal(t);
      if (t === 0) {
        setState("done");
        return;
      }
      pollRef.current = setInterval(checkProgress, 15_000);
    } catch {
      setState("error");
    }
  };

  useEffect(() => stopPolling, []);

  return (
    <View style={{ gap: 10 }}>
      <Text style={s.copy}>
        fills in covers, page counts, isbns, and genres using hardcover. runs in
        the background — you can leave this screen.
        {remaining !== null && remaining > 0
          ? ` · ${remaining} books still need enrichment`
          : ""}
      </Text>
      {state === "idle" ? (
        <Pressable
          onPress={start}
          style={({ pressed }) => [s.btn, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.btnText}>enrich library metadata</Text>
        </Pressable>
      ) : state === "running" ? (
        <>
          <Text style={s.copy}>
            enriching{total ? ` ${total} books` : ""}… running in the background
          </Text>
          <Pressable hitSlop={8} onPress={checkProgress}>
            <Text style={s.link}>check progress</Text>
          </Pressable>
        </>
      ) : state === "done" ? (
        <>
          <Text style={s.ok}>
            {total === 0
              ? "all books are already enriched."
              : `done — ${total} book${total === 1 ? "" : "s"} enriched.`}
          </Text>
          <Pressable
            hitSlop={8}
            onPress={() => {
              setState("idle");
              setTotal(null);
              setRemaining(null);
            }}
          >
            <Text style={s.link}>run again</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={s.err}>something went wrong. try again later.</Text>
          <Pressable hitSlop={8} onPress={() => setState("idle")}>
            <Text style={s.link}>try again</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
