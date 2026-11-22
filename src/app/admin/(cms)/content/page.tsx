import type { Metadata } from "next";
import { getLocale } from "@/lib/locale-server";
import { getHomePageContent } from "@/modules/home-content";
import { HomeContentForm } from "@/modules/home-content/form";
import { homeContentMessage } from "@/modules/home-content/messages";

export const metadata: Metadata = { title: "Home page content" };

export default async function AdminHomeContentPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [{ mode, content }, locale, params] = await Promise.all([getHomePageContent(), getLocale(), searchParams]);
  const m = (key: Parameters<typeof homeContentMessage>[1]) => homeContentMessage(locale, key);
  return <>
    <div className="admin-heading"><div><p className="eyebrow">{m("title")}</p><h1>{m("title")}</h1><p>{m("intro")}</p></div></div>
    {mode === "preview" ? <p className="admin-notice">{m("preview")}</p> : null}
    {params.saved === "1" ? <p className="admin-notice" role="status">{m("saved")}</p> : null}
    <HomeContentForm locale={locale} initial={content} editable={mode === "database"} />
  </>;
}
