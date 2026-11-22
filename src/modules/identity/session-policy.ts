export function isOwnerSession(
  payload: { role?: unknown; email?: unknown },
  configuredEmail: string | null,
): boolean {
  return Boolean(
    configuredEmail &&
    payload.role === "owner" &&
    payload.email === configuredEmail,
  );
}
