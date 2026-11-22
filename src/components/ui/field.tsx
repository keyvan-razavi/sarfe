import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "./help-tooltip";

export type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, htmlFor, error, hint, children, className }: FieldProps) {
  const control = isValidElement(children)
    ? (() => {
        const child = children as ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
        const descriptionIds = [child.props["aria-describedby"], error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined]
          .filter((value): value is string => Boolean(value));
        return cloneElement(child, {
        id: htmlFor,
        "aria-describedby": descriptionIds.length > 0 ? descriptionIds.join(" ") : undefined,
        "aria-invalid": error ? true : undefined,
      })
      })()
    : children;
  return (
    <div className={cn("ui-field", className)}>
      <div className="ui-field__label-row">
        <label className="ui-field__label" htmlFor={htmlFor}>{label}</label>
        {hint ? <HelpTooltip text={hint} id={`${htmlFor}-hint`} /> : null}
      </div>
      {control}
      {error ? <p className="ui-field__error" id={`${htmlFor}-error`} role="alert">{error}</p> : null}
    </div>
  );
}
