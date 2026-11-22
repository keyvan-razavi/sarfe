import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/modules/identity";
import { previewHomePageContent } from "./fixtures";
import { homePageContentSchema, parseStoredHomePageContent, type HomePageContent } from "./validation";

export async function getHomePageContent() {
  if (!process.env.DATABASE_URL) return { mode: "preview" as const, content: previewHomePageContent };
  const stored = await prisma.homePageContent.findUnique({ where: { id: "home" } });
  return { mode: "database" as const, content: stored ? parseStoredHomePageContent(stored.translations) : previewHomePageContent };
}

export async function saveHomePageContent(raw: unknown): Promise<void> {
  await requireOwner();
  if (!process.env.DATABASE_URL) {
    throw new Error("Home page content cannot be edited in preview mode. Configure PostgreSQL first.");
  }
  const content: HomePageContent = homePageContentSchema.parse(raw);
  await prisma.homePageContent.upsert({
    where: { id: "home" },
    create: { id: "home", translations: content as unknown as Prisma.InputJsonValue },
    update: { translations: content as unknown as Prisma.InputJsonValue },
  });
}
