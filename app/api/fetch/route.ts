import { NextRequest, NextResponse } from "next/server";
import { createTurndownService, cleanupTurndownOutput } from "@/lib/turndown";
import type { PageContent } from "@/lib/types";

const turndown = createTurndownService();

function isSitemapXml(contentType: string, text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  const isXml =
    contentType.includes("xml") ||
    trimmed.startsWith("<?xml") ||
    trimmed.startsWith("<urlset") ||
    trimmed.startsWith("<sitemapindex");
  if (!isXml) return false;
  return trimmed.includes("http://www.sitemaps.org/schemas/sitemap");
}

function extractXmlTagValue(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].trim() : undefined;
}

function renderSitemapMarkdown(xml: string, baseUrl: string): { markdown: string; title: string } {
  const urlBlocks = xml.match(/<url\b[\s\S]*?<\/url>/gi) ?? [];
  const sitemapBlocks = xml.match(/<sitemap\b[\s\S]*?<\/sitemap>/gi) ?? [];
  const hostname = (() => {
    try {
      return new URL(baseUrl).hostname;
    } catch {
      return "";
    }
  })();

  const lines: string[] = [];
  const title = hostname ? `Sitemap - ${hostname}` : "Sitemap";
  lines.push(`# ${title}`);

  if (urlBlocks.length > 0) {
    lines.push(`\nFound ${urlBlocks.length} URLs:\n`);
    for (const block of urlBlocks) {
      const loc = extractXmlTagValue(block, "loc");
      if (!loc) continue;
      const lastmod = extractXmlTagValue(block, "lastmod");
      const changefreq = extractXmlTagValue(block, "changefreq");
      const priority = extractXmlTagValue(block, "priority");
      const meta: string[] = [];
      if (lastmod) meta.push(`lastmod: ${lastmod}`);
      if (changefreq) meta.push(`changefreq: ${changefreq}`);
      if (priority) meta.push(`priority: ${priority}`);
      lines.push(`- [${loc}](${loc})${meta.length ? ` — ${meta.join(" · ")}` : ""}`);
    }
  } else if (sitemapBlocks.length > 0) {
    lines.push(`\nFound ${sitemapBlocks.length} sitemaps:\n`);
    for (const block of sitemapBlocks) {
      const loc = extractXmlTagValue(block, "loc");
      if (!loc) continue;
      const lastmod = extractXmlTagValue(block, "lastmod");
      lines.push(`- [${loc}](${loc})${lastmod ? ` — lastmod: ${lastmod}` : ""}`);
    }
  } else {
    lines.push("\n_No sitemap entries found._\n");
  }

  return { markdown: lines.join("\n"), title };
}

function getCharset(contentType: string): string {
  const match = contentType.match(/charset=([^;]+)/i);
  return match ? match[1].trim().replace(/"/g, "").toLowerCase() : "utf-8";
}

async function decodeResponseBody(response: Response, contentType: string): Promise<string> {
  const buffer = await response.arrayBuffer();
  const charset = getCharset(contentType);
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, sendAcceptMd = true, autoConvert = true } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`[API] Fetching: ${url}`);

    // Build Accept header based on settings
    const acceptHeader = sendAcceptMd
      ? "text/markdown, text/x-markdown, text/plain, text/html, */*"
      : "text/html, */*";

    const response = await fetch(url, {
      headers: {
        Accept: acceptHeader,
        "User-Agent": "MDBrowser/1.0 (Web Markdown Browser)",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";
    const finalUrl = response.url;
    let text = await decodeResponseBody(response, contentType);
    let title = "";
    let wasMarkdown = false;
    let markdown = "";
    let rawHtml = "";

    if (isSitemapXml(contentType, text)) {
      const { markdown: sitemapMarkdown, title: sitemapTitle } = renderSitemapMarkdown(text, finalUrl);
      const pageContent: PageContent = {
        url: finalUrl,
        markdown: sitemapMarkdown,
        rawHtml: "",
        title: sitemapTitle,
        wasMarkdown: true,
      };
      return NextResponse.json(pageContent);
    }

    // Check if response is markdown
    if (
      contentType.includes("text/markdown") ||
      contentType.includes("text/x-markdown") ||
      (contentType.includes("text/plain") && !text.trim().startsWith("<!") && !text.trim().startsWith("<html"))
    ) {
      wasMarkdown = true;
      markdown = text;
      rawHtml = "";

      // Try to extract title from first heading
      const headingMatch = markdown.match(/^#\s+(.+)$/m);
      title = headingMatch ? headingMatch[1] : new URL(finalUrl).hostname;
    } else {
      // It's HTML
      wasMarkdown = false;
      rawHtml = text;

      // Extract title from HTML
      const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : new URL(finalUrl).hostname;

      if (autoConvert) {
        // Clean up HTML before conversion
        let cleanHtml = text
          .replace(/<head[\s\S]*?<\/head>/gi, "")
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/<nav[\s\S]*?<\/nav>/gi, "")
          .replace(/<footer[\s\S]*?<\/footer>/gi, "")
          .replace(/<aside[\s\S]*?<\/aside>/gi, "")
          .replace(/<form[\s\S]*?<\/form>/gi, "")
          .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
          .replace(/<a[^>]*>\s*<\/a>/gi, "");

        // If there's a main or article tag, use that
        const mainMatch =
          cleanHtml.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i) ||
          cleanHtml.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i);
        if (mainMatch) {
          cleanHtml = mainMatch[1];
        } else {
          const bodyMatch = cleanHtml.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
          if (bodyMatch) {
            cleanHtml = bodyMatch[1];
          }
        }

        // Convert to markdown
        markdown = turndown.turndown(cleanHtml);

        // Clean up Turndown output
        markdown = cleanupTurndownOutput(markdown);
      } else {
        markdown = rawHtml;
      }
    }

    const pageContent: PageContent = {
      url: finalUrl,
      markdown,
      rawHtml,
      title,
      wasMarkdown,
    };

    return NextResponse.json(pageContent);
  } catch (error) {
    console.error("[API] Fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: errorMessage,
        url: "",
        markdown: `# Error Loading Page\n\nFailed to load the URL.\n\n**Error:** ${errorMessage}`,
        rawHtml: "",
        title: "Error",
        wasMarkdown: false,
      },
      { status: 500 }
    );
  }
}
