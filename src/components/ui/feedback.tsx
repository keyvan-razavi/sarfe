import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FeedbackProps = { title: string; children?: ReactNode; className?: string };

export function EmptyState({ title, children, className }: FeedbackProps) {
  return <section className={cn("ui-feedback", className)} aria-label={title}><h2>{title}</h2>{children ? <div>{children}</div> : null}</section>;
}

export function ErrorState({ title = "Something went wrong", children, className }: FeedbackProps & { title?: string }) {
  return <section className={cn("ui-feedback ui-feedback--error", className)} role="alert"><h2>{title}</h2>{children ? <div>{children}</div> : null}</section>;
}
