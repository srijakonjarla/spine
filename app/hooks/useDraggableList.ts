import { useRef } from "react";

/**
 * Shared drag-to-reorder hook.
 * Returns event handlers to attach to draggable rows,
 * plus a reorder function that moves an item and persists via `onSave`.
 */
export function useDraggableList<T extends { id: string }>(
  setItems: React.Dispatch<React.SetStateAction<T[]>>,
  onSave: (orderedIds: string[]) => void,
  saveDelay = 500
) {
  const dragId = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onDragStart = (id: string) => {
    dragId.current = id;
  };

  const onDrop = (targetId: string) => {
    if (!dragId.current || dragId.current === targetId) return;
    const from = dragId.current;
    dragId.current = null;

    setItems((prev) => {
      const items = [...prev];
      const fromIdx = items.findIndex((i) => i.id === from);
      const toIdx = items.findIndex((i) => i.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onSave(items.map((i) => i.id)), saveDelay);
      return items;
    });
  };

  const dragProps = (id: string) => ({
    draggable: true as const,
    onDragStart: () => onDragStart(id),
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: () => onDrop(id),
  });

  return { dragProps };
}
