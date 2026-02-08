import { marked } from "marked";

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: false,
});

// Parse YAML frontmatter from markdown
export function parseFrontmatter(markdown: string): { frontmatter: Record<string, unknown> | null; content: string } {
  const trimmed = markdown.trim();

  if (!trimmed.startsWith("---")) {
    return { frontmatter: null, content: markdown };
  }

  const endIndex = trimmed.indexOf("\n---", 3);
  if (endIndex === -1) {
    return { frontmatter: null, content: markdown };
  }

  const yamlContent = trimmed.substring(4, endIndex).trim();
  const remainingContent = trimmed.substring(endIndex + 4).trim();

  // Parse YAML manually (simple key: value pairs and arrays)
  const frontmatter: Record<string, unknown> = {};
  const lines = yamlContent.split("\n");
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    // Check for array item
    if (trimmedLine.startsWith("- ") && currentKey && currentArray) {
      const value = trimmedLine.substring(2).trim();
      const unquoted = value.replace(/^["']|["']$/g, "");
      currentArray.push(unquoted);
      continue;
    }

    // Check for key: value
    const colonIndex = trimmedLine.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmedLine.substring(0, colonIndex).trim();
      let value = trimmedLine.substring(colonIndex + 1).trim();

      // Save previous array if exists
      if (currentKey && currentArray) {
        frontmatter[currentKey] = currentArray;
      }

      if (value === "" || value === "|" || value === ">") {
        currentKey = key;
        currentArray = [];
      } else {
        value = value.replace(/^["']|["']$/g, "");
        frontmatter[key] = value;
        currentKey = null;
        currentArray = null;
      }
    }
  }

  // Don't forget the last array
  if (currentKey && currentArray) {
    frontmatter[currentKey] = currentArray;
  }

  return { frontmatter, content: remainingContent };
}

// Resolve relative URLs
export function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

// Fix relative URLs in markdown
export function fixRelativeUrls(markdown: string, baseUrl: string): string {
  try {
    const base = new URL(baseUrl);

    // Fix markdown image links
    markdown = markdown.replace(
      /!\[([^\]]*)\]\((?!https?:\/\/|data:|#)([^)]+)\)/g,
      (match, alt, path) => {
        const absoluteUrl = new URL(path, base).href;
        return `![${alt}](${absoluteUrl})`;
      }
    );

    // Fix markdown links
    markdown = markdown.replace(
      /\[([^\]]+)\]\((?!https?:\/\/|data:|#|mailto:)([^)]+)\)/g,
      (match, text, path) => {
        const absoluteUrl = new URL(path, base).href;
        return `[${text}](${absoluteUrl})`;
      }
    );

    return markdown;
  } catch {
    return markdown;
  }
}

// Render markdown to HTML
export function renderMarkdown(markdown: string, baseUrl: string): string {
  // Parse and remove frontmatter
  const { content } = parseFrontmatter(markdown);
  const fixedContent = fixRelativeUrls(content, baseUrl);
  let html = marked.parse(fixedContent) as string;
  const base = baseUrl.split("#")[0];
  if (base) {
    html = html.replace(/href="#([^"]*)"/g, `href="${base}#$1"`);
  }
  return html;
}
