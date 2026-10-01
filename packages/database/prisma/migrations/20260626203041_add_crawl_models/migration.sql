-- CreateTable
CREATE TABLE "CrawledPage" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "discoverySource" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "finalUrl" TEXT,
    "pageTitle" TEXT,
    "contentType" TEXT,
    "language" TEXT,
    "canonicalUrl" TEXT,
    "isIndexable" BOOLEAN NOT NULL DEFAULT true,
    "crawlDepth" INTEGER NOT NULL DEFAULT 0,
    "inboundLinkCount" INTEGER NOT NULL DEFAULT 0,
    "outboundLinkCount" INTEGER NOT NULL DEFAULT 0,
    "hasScreenshot" BOOLEAN NOT NULL DEFAULT false,
    "hasTrace" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "businessCriticality" TEXT NOT NULL DEFAULT 'NORMAL',
    "healthScore" DOUBLE PRECISION,
    "crawlDecision" TEXT NOT NULL DEFAULT 'VISITED',
    "skipReason" TEXT,
    "crawlDurationMs" INTEGER,
    "firstDiscoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawledPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlLink" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "sourcePageId" TEXT NOT NULL,
    "destPageId" TEXT,
    "destUrl" TEXT NOT NULL,
    "anchorText" TEXT,
    "elementContext" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "isBroken" BOOLEAN NOT NULL DEFAULT false,
    "httpStatus" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RobotsTxtCache" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "parsedRules" JSONB NOT NULL,
    "sitemapUrls" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RobotsTxtCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitemapEntry" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "sitemapUrl" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "lastModified" TIMESTAMP(3),
    "changeFrequency" TEXT,
    "priority" DOUBLE PRECISION,
    "isReachable" BOOLEAN NOT NULL DEFAULT true,
    "httpStatus" INTEGER,
    "blockedByRobots" BOOLEAN NOT NULL DEFAULT false,
    "foundViaLinks" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SitemapEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrawledPage_testRunId_idx" ON "CrawledPage"("testRunId");

-- CreateIndex
CREATE INDEX "CrawledPage_normalizedUrl_idx" ON "CrawledPage"("normalizedUrl");

-- CreateIndex
CREATE INDEX "CrawlLink_testRunId_idx" ON "CrawlLink"("testRunId");

-- CreateIndex
CREATE INDEX "CrawlLink_sourcePageId_idx" ON "CrawlLink"("sourcePageId");

-- CreateIndex
CREATE INDEX "RobotsTxtCache_testRunId_idx" ON "RobotsTxtCache"("testRunId");

-- CreateIndex
CREATE INDEX "SitemapEntry_testRunId_idx" ON "SitemapEntry"("testRunId");

-- AddForeignKey
ALTER TABLE "CrawledPage" ADD CONSTRAINT "CrawledPage_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlLink" ADD CONSTRAINT "CrawlLink_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "CrawledPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlLink" ADD CONSTRAINT "CrawlLink_destPageId_fkey" FOREIGN KEY ("destPageId") REFERENCES "CrawledPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobotsTxtCache" ADD CONSTRAINT "RobotsTxtCache_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitemapEntry" ADD CONSTRAINT "SitemapEntry_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
