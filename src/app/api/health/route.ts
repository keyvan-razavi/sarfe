import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const headers = { "Cache-Control": "no-store" };
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready" }, { status: 200, headers });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers });
  }
}
