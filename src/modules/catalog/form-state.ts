export type CatalogFormValues = Record<string, string | boolean>;

export type CatalogFormState = {
  submitted: boolean;
  values: CatalogFormValues;
  fieldErrors: Record<string, string>;
  formError?: string;
};

export type CatalogFormAction = (
  previousState: CatalogFormState,
  formData: FormData,
) => Promise<CatalogFormState>;

export type JsonParseResult =
  | { success: true; value: unknown }
  | { success: false };

export function emptyCatalogFormState(): CatalogFormState {
  return { submitted: false, values: {}, fieldErrors: {} };
}

/** Extract only named controls; FormData may also contain framework or attacker-added fields. */
export function extractCatalogFormValues(
  formData: FormData,
  fields: readonly string[],
  checkboxes: readonly string[] = [],
): CatalogFormValues {
  const values: CatalogFormValues = {};
  for (const field of fields) {
    if (checkboxes.includes(field)) {
      values[field] = formData.get(field) === "on";
      continue;
    }
    const value = formData.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  return values;
}

export function fieldValue(
  state: CatalogFormState,
  field: string,
  fallback: string | boolean = "",
): string | boolean {
  return state.submitted && Object.hasOwn(state.values, field)
    ? state.values[field]!
    : fallback;
}

export function parseCatalogJson(value: string): JsonParseResult {
  try {
    return { success: true, value: JSON.parse(value) as unknown };
  } catch {
    return { success: false };
  }
}

export function catalogFailureState(
  formData: FormData,
  fields: readonly string[],
  checkboxes: readonly string[],
  fieldErrors: Record<string, string>,
  formError: string,
): CatalogFormState {
  const allowedFields = new Set(fields);
  return {
    submitted: true,
    values: extractCatalogFormValues(formData, fields, checkboxes),
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors).filter(([field]) => allowedFields.has(field)),
    ),
    formError,
  };
}

export function formFieldFromIssues(
  issues: readonly { path: readonly PropertyKey[] }[],
  allowedFields: readonly string[],
): string | undefined {
  const allowed = new Set(allowedFields);
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && allowed.has(field)) return field;
  }
  return undefined;
}
