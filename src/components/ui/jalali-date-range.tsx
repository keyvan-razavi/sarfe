"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  findGregorianDate,
  formatIsoDate,
  getJalaliMonthLabel,
  getJalaliParts,
  parseIsoDate,
  shiftJalaliMonth,
  toIsoDate,
  type IsoDate,
  type JalaliLocale,
} from "./jalali-calendar";
import styles from "./jalali-date-range.module.css";

export type JalaliDateRangeProps = {
  from: string;
  to: string;
  locale: JalaliLocale;
  fromLabel: string;
  toLabel: string;
  clearLabel: string;
  className?: string;
};

const WEEKDAYS: Record<JalaliLocale, string[]> = {
  fa: ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"],
  ckb: ["شەممە", "یەکشەممە", "دووشەممە", "سێشەممە", "چوارشەممە", "پێنجشەممە", "هەینی"],
};

function localizedNumber(value: number, locale: JalaliLocale): string {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "ckb-IQ", { useGrouping: false }).format(value);
}

function dateNumber(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function JalaliDateRange({ from, to, locale, fromLabel, toLabel, clearLabel, className }: JalaliDateRangeProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ from, to });
  const parsedFrom = parseIsoDate(range.from);
  const parsedTo = parseIsoDate(range.to);
  const initialDate = parsedFrom ?? parsedTo ?? new Date();
  const initialParts = getJalaliParts(initialDate, locale);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState({ year: initialParts.year, month: initialParts.month });
  const [awaitingEnd, setAwaitingEnd] = useState(Boolean(parsedFrom && !parsedTo));
  const monthStart = useMemo(
    () => findGregorianDate(month.year, month.month, 1, locale),
    [month.year, month.month, locale],
  );

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const cells = useMemo(() => {
    if (!monthStart) return [];
    // Jalali weeks begin on Saturday; UTC Sunday is day zero.
    const leading = (monthStart.getUTCDay() + 1) % 7;
    const first = new Date(monthStart);
    first.setUTCDate(first.getUTCDate() - leading);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + index);
      const parts = getJalaliParts(date, locale);
      return { date, iso: toIsoDate(date), day: parts.day, inMonth: parts.year === month.year && parts.month === month.month };
    });
  }, [locale, month.month, month.year, monthStart]);

  function selectDate(iso: IsoDate) {
    if (!awaitingEnd) {
      setRange({ from: iso, to: "" });
      setAwaitingEnd(true);
      return;
    }
    const currentStart = parseIsoDate(range.from);
    const selected = parseIsoDate(iso);
    if (currentStart && selected && dateNumber(selected) < dateNumber(currentStart)) {
      setRange({ from: iso, to: range.from });
    } else {
      setRange({ from: range.from || iso, to: iso });
    }
    setAwaitingEnd(false);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  const previousMonth = () => setMonth((current) => shiftJalaliMonth(current.year, current.month, -1));
  const nextMonth = () => setMonth((current) => shiftJalaliMonth(current.year, current.month, 1));
  const intervalStart = parsedFrom ? dateNumber(parsedFrom) : null;
  const intervalEnd = parsedTo ? dateNumber(parsedTo) : null;

  return (
    <div className={`${styles.root}${className ? ` ${className}` : ""}`}>
      <input type="hidden" name="from" value={range.from} />
      <input type="hidden" name="to" value={range.to} />
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) {
            const selected = parseIsoDate(range.from) ?? parseIsoDate(range.to);
            if (selected) {
              const parts = getJalaliParts(selected, locale);
              setMonth({ year: parts.year, month: parts.month });
            }
          }
          setOpen((value) => !value);
        }}
      >
        <span className={styles.rangeFields}>
          <span><span className={styles.fieldLabel}>{fromLabel}</span><strong>{formatIsoDate(range.from, locale) || "—"}</strong></span>
          <span className={styles.separator} aria-hidden="true">→</span>
          <span><span className={styles.fieldLabel}>{toLabel}</span><strong>{formatIsoDate(range.to, locale) || "—"}</strong></span>
        </span>
        <span className={styles.calendarIcon} aria-hidden="true">▦</span>
      </button>

      {open && (
        <div ref={dialogRef} className={styles.popover} role="dialog" aria-label={locale === "fa" ? "انتخاب بازهٔ زمانی" : "دیاریکردنی ماوەی کات"}>
          <div className={styles.header}>
            <button className={styles.navButton} type="button" onClick={previousMonth} aria-label={locale === "fa" ? "ماه پیش" : "مانگی پێشوو"}>‹</button>
            <h2 className={styles.monthTitle} aria-live="polite">{getJalaliMonthLabel(month.year, month.month, locale)}</h2>
            <button className={styles.navButton} type="button" onClick={nextMonth} aria-label={locale === "fa" ? "ماه بعد" : "مانگی داهاتوو"}>›</button>
          </div>
          <p className={styles.hint}>
            {awaitingEnd
              ? locale === "fa" ? "روز پایان را انتخاب کنید" : "ڕۆژی کۆتایی هەڵبژێرە"
              : locale === "fa" ? "روز آغاز را انتخاب کنید" : "ڕۆژی دەستپێک هەڵبژێرە"}
          </p>
          <div className={styles.calendarGrid} aria-label={getJalaliMonthLabel(month.year, month.month, locale)}>
            {WEEKDAYS[locale].map((weekday) => <span key={weekday} className={styles.weekday}>{weekday}</span>)}
            {cells.map(({ date, iso, day, inMonth }) => {
              const value = dateNumber(date);
              const selected = iso === range.from || iso === range.to;
              const inRange = intervalStart !== null && intervalEnd !== null && value > intervalStart && value < intervalEnd;
              const label = formatIsoDate(iso, locale);
              return (
                <button
                  key={iso}
                  type="button"
                  className={`${styles.day}${inMonth ? "" : ` ${styles.outsideMonth}`}${selected ? ` ${styles.selected}` : ""}${inRange ? ` ${styles.inRange}` : ""}`}
                  aria-label={label}
                  aria-pressed={selected}
                  onClick={() => selectDate(iso)}
                  tabIndex={inMonth ? 0 : -1}
                >
                  {localizedNumber(day, locale)}
                </button>
              );
            })}
          </div>
          <div className={styles.footer}>
            <button
              className={styles.clearButton}
              type="button"
              onClick={() => {
                setRange({ from: "", to: "" });
                setAwaitingEnd(false);
                setOpen(false);
                requestAnimationFrame(() => triggerRef.current?.focus());
              }}
            >
              {clearLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default JalaliDateRange;
