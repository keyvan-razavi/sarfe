"use client";

import { useSyncExternalStore } from "react";
import { isSupportedCurrency } from "../../lib/currency.ts";
import { isLocalImagePath } from "@/lib/media-path";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  translations?: {
    fa?: { name?: string; description?: string };
    ckb?: { name?: string; description?: string };
  } | null;
  variantId: string;
  variantName: string;
  image: string | null;
  isPreview: boolean;
  unitPriceMinor: number;
  currency: string;
  maxStock: number;
  quantity: number;
};

function validTranslations(value: unknown) {
  if (value === undefined || value === null) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  for (const locale of ["fa", "ckb"] as const) {
    const translation = (value as Record<string, unknown>)[locale];
    if (translation === undefined) continue;
    if (
      !translation ||
      typeof translation !== "object" ||
      Array.isArray(translation)
    )
      return false;
    const item = translation as Record<string, unknown>;
    if (item.name !== undefined && typeof item.name !== "string") return false;
    if (item.description !== undefined && typeof item.description !== "string")
      return false;
  }
  return true;
}

const STORAGE_KEY = "sarfe-cart-v1";
const EMPTY: CartLine[] = [];
let snapshot: CartLine[] = EMPTY;
let initialized = false;
const listeners = new Set<() => void>();

export function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Partial<CartLine>;
  return (
    typeof line.productId === "string" &&
    line.productId.length > 0 &&
    typeof line.slug === "string" &&
    typeof line.name === "string" &&
    typeof line.variantId === "string" &&
    line.variantId.length > 0 &&
    typeof line.variantName === "string" &&
    (line.image === null || isLocalImagePath(line.image)) &&
    validTranslations(line.translations) &&
    typeof line.isPreview === "boolean" &&
    typeof line.currency === "string" &&
    isSupportedCurrency(line.currency) &&
    Number.isSafeInteger(line.unitPriceMinor) &&
    line.unitPriceMinor! >= 0 &&
    Number.isSafeInteger(line.maxStock) &&
    line.maxStock! > 0 &&
    Number.isSafeInteger(line.quantity) &&
    line.quantity! > 0 &&
    line.quantity! <= line.maxStock! &&
    Number.isSafeInteger(line.unitPriceMinor! * line.quantity!)
  );
}

export function normalizeCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return EMPTY;
  const compatible = value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const line = item as Record<string, unknown>;
    return typeof line.image === "string" && !isLocalImagePath(line.image)
      ? { ...line, image: null }
      : item;
  });
  const valid = compatible.filter(isCartLine);
  const currency = valid[0]?.currency;
  if (!currency) return EMPTY;
  const byVariant = new Map<string, CartLine>();
  for (const line of valid) {
    if (line.currency !== currency) continue;
    const current = byVariant.get(line.variantId);
    const quantity = Math.min(
      line.maxStock,
      (current?.quantity ?? 0) + line.quantity,
    );
    const merged = { ...line, quantity };
    if (Number.isSafeInteger(merged.unitPriceMinor * quantity))
      byVariant.set(line.variantId, merged);
  }
  let subtotal = 0;
  const normalized: CartLine[] = [];
  for (const line of byVariant.values()) {
    const amount = line.unitPriceMinor * line.quantity;
    if (!Number.isSafeInteger(subtotal + amount)) continue;
    subtotal += amount;
    normalized.push(line);
    if (normalized.length >= 100) break;
  }
  return normalized;
}

export function parseStoredCart(value: string | null): CartLine[] {
  try {
    return normalizeCart(JSON.parse(value ?? "[]") as unknown);
  } catch {
    return EMPTY;
  }
}

export function tryAddLine(
  current: CartLine[],
  line: CartLine,
): { lines: CartLine[]; error: string | null } {
  if (!isCartLine(line))
    return { lines: current, error: "This option is currently unavailable." };
  const existing = current.find((item) => item.variantId === line.variantId);
  if (current.length > 0 && current[0]?.currency !== line.currency)
    return {
      lines: current,
      error: "Your cart can contain items in one currency at a time.",
    };
  if (
    existing &&
    existing.quantity >= Math.min(existing.maxStock, line.maxStock)
  )
    return {
      lines: current,
      error: "The available stock limit is already in your cart.",
    };
  const lines = existing
    ? current.map((item) =>
        item.variantId === line.variantId
          ? { ...line, quantity: Math.min(item.quantity + 1, line.maxStock) }
          : item,
      )
    : [...current, { ...line, quantity: 1 }];
  if (
    lines.length > 100 ||
    !Number.isSafeInteger(
      lines.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0),
    )
  )
    return { lines: current, error: "Your cart has reached its limit." };
  return { lines, error: null };
}

function notify() {
  for (const listener of listeners) listener();
}

function persist(lines: CartLine[]) {
  snapshot = lines;
  initialized = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* Storage may be unavailable. */
  }
  notify();
}

function initialize() {
  if (initialized || typeof window === "undefined") return;
  try {
    snapshot = parseStoredCart(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    snapshot = EMPTY;
  }
  initialized = true;
}

function handleStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  snapshot = parseStoredCart(event.key === null ? null : event.newValue);
  initialized = true;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initialize();
  window.addEventListener("storage", handleStorage);
  listener();
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot() {
  return snapshot;
}
function getServerSnapshot() {
  return EMPTY;
}
function getReadySnapshot() {
  return initialized;
}
function getServerReadySnapshot() {
  return false;
}

export function addCartLine(line: CartLine): string | null {
  initialize();
  const result = tryAddLine(snapshot, line);
  if (result.error) return result.error;
  persist(result.lines);
  return null;
}

export function setCartQuantity(variantId: string, quantity: number) {
  initialize();
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    persist(snapshot.filter((line) => line.variantId !== variantId));
    return;
  }
  const lines = snapshot.map((line) =>
    line.variantId === variantId
      ? { ...line, quantity: Math.min(quantity, line.maxStock) }
      : line,
  );
  const subtotal = lines.reduce(
    (sum, item) => sum + item.unitPriceMinor * item.quantity,
    0,
  );
  if (Number.isSafeInteger(subtotal)) persist(lines);
}

export function removeCartLine(variantId: string) {
  initialize();
  persist(snapshot.filter((line) => line.variantId !== variantId));
}

export function useCart() {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(
    subscribe,
    getReadySnapshot,
    getServerReadySnapshot,
  );
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalMinor = lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  const currency = lines[0]?.currency ?? "USD";
  return {
    lines,
    ready,
    add: addCartLine,
    setQuantity: setCartQuantity,
    remove: removeCartLine,
    count,
    subtotalMinor,
    currency,
  };
}
