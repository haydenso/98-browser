# 98 Browser - Windows 98 Markdown Browser

A modern web application that converts any website into clean, readable markdown format with a nostalgic Windows 98 interface powered by [98.css](https://jdan.github.io/98.css/).

## Features

- **Markdown-First Browsing**: Automatically converts HTML pages to clean markdown
- **Multiple View Modes**:
  - Preview: Rendered markdown with styling
  - Markdown: Raw markdown text
  - HTML: Original HTML content (for comparison)
- **Windows 98 Retro UI**: Classic Windows 98 styling using 98.css
- **Smart URL Handling**: Supports both direct URLs and search queries
- **Settings**:
  - Accept MD: Send `Accept: text/markdown` header to request native markdown
  - Auto Convert: Automatically convert HTML to markdown
- **Sitemap Support**: Special rendering for XML sitemaps
- **Advanced HTML Cleanup**: Removes navigation, footers, ads, and other noise

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: 98.css + Custom CSS
- **Markdown Processing**:
  - `marked`: Markdown to HTML rendering
  - `turndown`: HTML to Markdown conversion
  - `turndown-plugin-gfm`: GitHub Flavored Markdown support

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm or Bun package manager

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **URL Input**: Enter any URL or search query
2. **Server-Side Fetching**: The `/api/fetch` route fetches the content server-side to avoid CORS issues
3. **HTML Processing**:
   - Detects content type (markdown, HTML, XML sitemap)
   - Cleans HTML by removing scripts, styles, nav, footer, etc.
   - Extracts main content from `<main>` or `<article>` tags
4. **Markdown Conversion**: Uses Turndown to convert HTML to clean markdown
5. **Client-Side Rendering**: Renders markdown with your selected view mode

## Project Structure

```
98-browser/
├── app/
│   ├── api/
│   │   └── fetch/
│   │       └── route.ts          # Server-side URL fetching API
│   ├── layout.tsx                # Root layout with 98.css
│   ├── page.tsx                  # Main browser component
│   └── globals.css               # Custom Windows 98 styles
├── lib/
│   ├── turndown.ts               # HTML to Markdown conversion
│   ├── markdown.ts               # Markdown rendering utilities
│   └── types.ts                  # TypeScript type definitions
├── next.config.mjs               # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

## Key Components

### API Route (`/api/fetch`)

- Fetches URLs server-side to bypass CORS
- Handles character encoding detection
- Supports markdown, HTML, and XML sitemap content types
- Performs intelligent HTML cleanup before conversion

### Main Page (`app/page.tsx`)

- Client component with React state management
- Three view modes: Preview, Markdown, HTML
- Configurable settings for markdown handling
- Windows 98 styled UI with 98.css

### Turndown Service (`lib/turndown.ts`)

- Custom Turndown configuration
- Preserves links with proper labels
- Handles edge cases like blank links and images
- Cleans up output for better readability

## Configuration

The browser automatically handles markdown conversion with these built-in settings:

- **Accept MD**: Sends `Accept: text/markdown` header to request native markdown from servers that support it
- **Auto Convert**: Automatically converts HTML pages to markdown

## Browser Compatibility

Works in all modern browsers that support:
- ES2020+ JavaScript features
- CSS Grid and Flexbox
- Fetch API

## Credits

- **98.css**: [https://jdan.github.io/98.css/](https://jdan.github.io/98.css/)
- **Original Inspiration**: Based on the original 98-browser desktop application

## License

ISC

## Development

This project was converted from a desktop Electron/Electrobun application to a modern Next.js web app. The core markdown conversion logic and URL fetching capabilities remain the same, now accessible from any web browser with a nostalgic Windows 98 interface.
