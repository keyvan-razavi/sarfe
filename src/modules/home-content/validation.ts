import { z } from "zod";
import { isLocalImagePath } from "@/lib/media-path";
import { previewHomePageContent } from "./fixtures";

const localImagePath = z.string().trim().refine(isLocalImagePath, "Choose a local image from this store.");

const localeContentSchema = z.object({
  heroTitle: z.string().trim().min(1).max(160),
  heroBody: z.string().trim().min(1).max(2_000),
  ctaLabel: z.string().trim().min(1).max(80),
  heroImage: localImagePath,
  heroImageAlt: z.string().trim().min(1).max(240),
  healthTitle: z.string().trim().min(1).max(160),
  healthBody: z.string().trim().min(1).max(2_000),
  cultureTitle: z.string().trim().min(1).max(160),
  cultureBody: z.string().trim().min(1).max(2_000),
  aboutTitle: z.string().trim().min(1).max(160),
  aboutBody: z.string().trim().min(1).max(2_000),
  aboutImage: localImagePath,
  aboutImageAlt: z.string().trim().min(1).max(240),
});

const legacyDefaultCopy = {
  fa: {
    heroTitle: "خرید خانه، ساده‌تر.",
    heroBody: "برنج، روغن، رب و نیازهای خانه را در یک کاتالوگ روشن و ساده پیدا کنید.",
    ctaLabel: "رفتن به کاتالوگ",
    heroImage: "/images/grocery/staples.webp",
    heroImageAlt: "قفسه‌های خواربار در فروشگاه",
    aboutTitle: "خرید خانه باید ساده و قابل‌اعتماد باشد.",
    aboutBody: "صرفه، کاتالوگی برای نیازهای خوراکی و خانه است؛ با دسته‌بندی روشن و اطلاعاتی که پیش از انتخاب می‌توانید بررسی کنید.",
  },
  ckb: {
    heroTitle: "کڕینی ماڵ، ئاسانتر.",
    heroBody: "برنج، ڕۆن، ڕەب و پێداویستییەکانی ماڵ لە کاتالۆگێکی ڕووندا بدۆزەرەوە.",
    ctaLabel: "چوون بۆ کاتالۆگ",
    heroImage: "/images/grocery/staples.webp",
    heroImageAlt: "ڕەفی خۆراک لە فرۆشگادا",
    aboutTitle: "کڕینی ماڵ دەبێت ئاسان و متمانەپێکراو بێت.",
    aboutBody: "صرفه کاتالۆگێکە بۆ پێداویستییە خۆراکی و ماڵییەکان؛ بە پۆلێنکردنی ڕوون و زانیاریی پێویست پێش هەڵبژاردن.",
  },
} as const;

export const homePageContentSchema = z.object({
  fa: localeContentSchema,
  ckb: localeContentSchema,
});

export type HomePageContent = z.infer<typeof homePageContentSchema>;

export function parseStoredHomePageContent(value: unknown): HomePageContent {
  const stored = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const localeValues = (locale: "fa" | "ckb") => {
    const candidate = stored[locale];
    const candidateRecord = typeof candidate === "object" && candidate !== null ? candidate as Record<string, unknown> : {};
    const merged: Record<string, unknown> = {
      ...previewHomePageContent[locale],
      ...candidateRecord,
    };
    for (const [key, oldDefault] of Object.entries(legacyDefaultCopy[locale])) {
      if (candidateRecord[key] === oldDefault) merged[key] = previewHomePageContent[locale][key as keyof HomePageContent[typeof locale]];
    }
    return merged;
  };
  return homePageContentSchema.parse({ fa: localeValues("fa"), ckb: localeValues("ckb") });
}
