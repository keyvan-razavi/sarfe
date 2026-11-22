CREATE TABLE "HomePageContent" (
    "id" TEXT NOT NULL DEFAULT 'home',
    "translations" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HomePageContent_pkey" PRIMARY KEY ("id")
);
