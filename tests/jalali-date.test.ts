import assert from "node:assert/strict";
import test from "node:test";
import { formatJalaliDate } from "../src/lib/format";
import { findGregorianDate, getJalaliMonthLabel, getJalaliParts, shiftJalaliMonth } from "../src/components/ui/jalali-calendar";

test("Jalali date formatting keeps ISO report days stable in Tehran time", () => {
  assert.equal(formatJalaliDate("2024-03-20"), "۱۴۰۳/۰۱/۰۱");
  assert.equal(formatJalaliDate("2026-11-17"), "۱۴۰۵/۰۸/۲۶");
  assert.equal(formatJalaliDate("2024-03-20", "ckb-IQ"), "٠١/٠١/١٤٠٣");
});

test("Jalali calendar range conversion handles the new year boundary", () => {
  const newYear = findGregorianDate(1403, 1, 1, "fa");
  assert.ok(newYear);
  assert.equal(newYear.toISOString().slice(0, 10), "2024-03-20");
  assert.deepEqual(getJalaliParts(newYear, "fa"), { year: 1403, month: 1, day: 1 });
  assert.deepEqual(shiftJalaliMonth(1402, 12, 1), { year: 1403, month: 1 });
  assert.match(getJalaliMonthLabel(1403, 1, "ckb"), /فروردین/);
  assert.doesNotMatch(getJalaliMonthLabel(1403, 1, "ckb"), /Farvardin/);
});
