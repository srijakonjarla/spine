import { useState, useRef, useCallback } from "react";

/**
 * Minimal HTML5 drag-and-drop reorder hook.
 * Returns props to spread onto each draggable item and the current dragging id.
 */
export function useDragReorder<T extends { id: string }>(
  items: T[],
  onReorder: (newItems: T[]) => void,
) {
  const dragIndex = useRef<number | null>(null);
  const overIndex = useRef<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const itemProps = useCallback(
    (index: number, id: string) => ({
      draggable: true as const,
      onDragStart: (e: React.DragEvent) => {
        dragIndex.current = index;
        setDraggingId(id);
        e.dataTransfer.effectAllowed = "move";
      },
      onDragEnter: () => {
        overIndex.current = index;
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      },
      onDragEnd: () => {
        const from = dragIndex.current;
        const to = overIndex.current;
        if (from !== null && to !== null && from !== to) {
          const next = [...items];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          onReorder(next);
        }
        dragIndex.current = null;
        overIndex.current = null;
        setDraggingId(null);
      },
    }),
    [items, onReorder],
  );

  return { draggingId, itemProps };
}
