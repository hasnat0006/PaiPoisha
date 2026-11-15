// A list ranked by drag (categories: user, 2026-11-08; wallets the same way, 2026-11-15). Drag the grip on a phone or
// with a mouse; keyboard: focus the grip, Space, arrows, Space. Only the grip starts a drag, so the list still scrolls.
"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Active,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

interface Item {
  id: string;
  sort_order: number;
}

interface Props<T extends Item> {
  list: T[];
  /** The item's name, for screen-reader announcements. */
  label: (item: T) => string;
  /** The row's content beside the grip (usually a button that opens the item). */
  render: (item: T) => ReactNode;
  onReorder: (list: T[]) => void;
}

export function SortableList<T extends Item>({ list, label, render, onReorder }: Props<T>) {
  const t = useTranslations("manage");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // Show the dropped order until the saved order arrives (its sort_orders differ), so the row doesn't jump back.
  const signature = list.map((c) => `${c.id}:${c.sort_order}`).join();
  const [dropped, setDropped] = useState<{ base: string; items: T[] } | null>(null);
  const items = dropped?.base === signature ? dropped.items : list;

  // Screen-reader text in the user's language (dnd-kit's defaults are English).
  const name = (id: UniqueIdentifier) => {
    const c = items.find((x) => x.id === id);
    return c ? label(c) : "";
  };
  const accessibility = {
    screenReaderInstructions: { draggable: t("dragInstructions") },
    announcements: {
      onDragStart: ({ active }: { active: Active }) => t("dragPicked", { name: name(active.id) }),
      onDragOver: ({ active }: { active: Active }) => t("dragMoved", { name: name(active.id) }),
      onDragEnd: ({ active }: { active: Active }) => t("dragDropped", { name: name(active.id) }),
      onDragCancel: ({ active }: { active: Active }) => t("dragCancelled", { name: name(active.id) }),
    },
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(items, items.findIndex((c) => c.id === active.id), items.findIndex((c) => c.id === over.id));
    setDropped({ base: signature, items: next });
    onReorder(next);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={accessibility}>
      <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul className="divide-y rounded-xl border">
          {items.map((c) => (
            <Row key={c.id} id={c.id}>{render(c)}</Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Row({ id, children }: { id: string; children: ReactNode }) {
  const t = useTranslations("manage");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 bg-background pl-3 ${isDragging ? "relative z-10 rounded-xl shadow-lg" : ""}`}
    >
      {children}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={t("dragHandle")}
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-5" aria-hidden />
      </button>
    </li>
  );
}
