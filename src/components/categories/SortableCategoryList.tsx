// Category list ranked by drag (user, 2026-11-08; replaced the up/down buttons). Drag the grip on a phone or
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
import { EyeOff, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CategoryIcon } from "@/components/entries/CategoryIcon";
import type { Category } from "@/db/types";
import { useLocale } from "@/i18n/provider";
import { categoryName } from "@/lib/entries";

interface Props {
  list: Category[];
  onEdit: (c: Category) => void;
  onReorder: (list: Category[]) => void;
}

export function SortableCategoryList({ list, onEdit, onReorder }: Props) {
  const t = useTranslations("manage");
  const { locale } = useLocale();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // Show the dropped order until the saved order arrives (its sort_orders differ), so the row doesn't jump back.
  const signature = list.map((c) => `${c.id}:${c.sort_order}`).join();
  const [dropped, setDropped] = useState<{ base: string; items: Category[] } | null>(null);
  const items = dropped?.base === signature ? dropped.items : list;

  // Screen-reader text in the user's language (dnd-kit's defaults are English).
  const name = (id: UniqueIdentifier) => {
    const c = items.find((x) => x.id === id);
    return c ? categoryName(c, locale) : "";
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
            <Row key={c.id} category={c} onEdit={onEdit} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Row({ category: c, onEdit }: { category: Category; onEdit: (c: Category) => void }) {
  const t = useTranslations();
  const { locale } = useLocale();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 bg-background pl-3 ${isDragging ? "relative z-10 rounded-xl shadow-lg" : ""} ${c.hidden ? "opacity-60" : ""}`}
    >
      <button type="button" onClick={() => onEdit(c)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left">
        <CategoryIcon name={c.icon} color={c.color} />
        <span className="min-w-0 flex-1 truncate text-base">{categoryName(c, locale)}</span>
        {c.hidden && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <EyeOff className="size-4" aria-hidden />
            {t("categories.hidden")}
          </span>
        )}
      </button>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={t("manage.dragHandle")}
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-5" aria-hidden />
      </button>
    </li>
  );
}
