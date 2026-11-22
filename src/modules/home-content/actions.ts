"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveHomePageContent } from "./service";
import type { HomePageContent } from "./validation";

export type HomeContentFormState = { error?: string };

const languages = ["fa", "ckb"] as const;
const fields = ["heroTitle", "heroBody", "ctaLabel", "heroImage", "heroImageAlt", "healthTitle", "healthBody", "cultureTitle", "cultureBody", "aboutTitle", "aboutBody", "aboutImage", "aboutImageAlt"] as const;

export async function saveHomeContentAction(_previous: HomeContentFormState, form: FormData): Promise<HomeContentFormState> {
  const content = Object.fromEntries(languages.map((language) => [
    language,
    Object.fromEntries(fields.map((field) => [field, String(form.get(`${language}.${field}`) ?? "")])),
  ])) as unknown as HomePageContent;
  try {
    await saveHomePageContent(content);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save home page content." };
  }
  revalidatePath("/");
  revalidatePath("/admin/content");
  redirect("/admin/content?saved=1");
}
