import { useRef, useCallback } from "react";
import { updateListItem } from "@/lib/lists";
import type { BookList, ListItem } from "@/types";

type SetList = React.Dispatch<React.SetStateAction<BookList | null>>;

function patchItem(setList: SetList, id: string, patch: Partial<ListItem>) {
  setList((prev) =>
    prev
      ? { ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }
      : prev,
  );
}

/**
 * Returns typed handlers for updating individual list item fields.
 * Each debounced handler does an optimistic state update immediately and
 * persists to the DB after 600 ms of inactivity (per field per item).
 * `updateType` is intentionally non-debounced (status changes should save immediately).
 */
export function useListItemFields(setList: SetList) {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const debounce = useCallback(
    (timerKey: string, id: string, patch: Partial<ListItem>) => {
      patchItem(setList, id, patch);
      const existing = timers.current.get(timerKey);
      if (existing) clearTimeout(existing);
      timers.current.set(
        timerKey,
        setTimeout(() => {
          updateListItem(id, patch);
          timers.current.delete(timerKey);
        }, 600),
      );
    },
    [setList],
  );

  const updateNotes = useCallback(
    (id: string, notes: string) => debounce(id, id, { notes }),
    [debounce],
  );

  const updateDate = useCallback(
    (id: string, releaseDate: string) => debounce(id + "_date", id, { releaseDate }),
    [debounce],
  );

  const updatePrice = useCallback(
    (id: string, price: string) => debounce(id + "_price", id, { price }),
    [debounce],
  );

  const updateType = useCallback(
    (id: string, type: string) => {
      patchItem(setList, id, { type });
      updateListItem(id, { type });
    },
    [setList],
  );

  return { updateNotes, updateDate, updatePrice, updateType };
}
