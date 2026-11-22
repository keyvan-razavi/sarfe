import { useId } from "react";

export function HelpTooltip({ text, id }: { text: string; id?: string }) {
  const generatedId = useId();
  const descriptionId = id ?? generatedId;
  return (
    <span className="ui-help-tooltip" data-tooltip={text}>
      <span id={descriptionId} className="sr-only">{text}</span>
      <button type="button" aria-label={text} className="ui-help-tooltip__trigger">
        <span aria-hidden="true">i</span>
      </button>
    </span>
  );
}
