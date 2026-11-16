// Asks "are you sure?" before any delete/remove. `trigger` is the button that opens it; `onConfirm` does the delete.
"use client";

import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  trigger: ReactElement;
  title: string;
  body?: string;
  confirmLabel?: string; // defaults to "Delete"
  onConfirm: () => void;
}

export function ConfirmDelete({ trigger, title, body, confirmLabel, onConfirm }: Props) {
  const tc = useTranslations("common");
  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body ?? tc("deleteBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" className="min-h-11" onClick={onConfirm}>
            {confirmLabel ?? tc("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
