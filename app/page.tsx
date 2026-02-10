"use client";

import { useState, useRef } from "react";
import { renderMarkdown } from "@/lib/markdown";
import type { PageContent, ViewMode, BrowserSettings } from "@/lib/types";

export default function Home() {
  const [url, setUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [content, setContent] = useState<PageContent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<BrowserSettings>({
    sendAcceptMd: true,
    autoConvert: true,
  });
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const normalizeUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return "";

    if (trimmed.match(/^https?:\/\//i)) {
      return trimmed;
    }

    if (trimmed.includes(".") && !trimmed.includes(" ")) {
      return `https://${trimmed}`;
    }

    return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
  };

  const fetchPage = async (targetUrl: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: targetUrl,
          sendAcceptMd: settings.sendAcceptMd,
          autoConvert: settings.autoConvert,
        }),
      });

      const data = await response.json();
      setContent(data);
      setCurrentUrl(data.url);
      
      // Add to history if it's a new navigation (not from back button)
      setHistory(prev => [...prev.slice(0, historyIndex + 1), data.url]);
      setHistoryIndex(prev => prev + 1);
    } catch (error) {
      console.error("Fetch error:", error);
      setContent({
        url: targetUrl,
        markdown: `# Error\n\nFailed to load: ${targetUrl}\n\n${error}`,
        rawHtml: "",
        title: "Error",
        wasMarkdown: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeUrl(url);
    if (normalized) {
      fetchPage(normalized);
    }
  };

  const handleReload = () => {
    if (currentUrl) {
      fetchPage(currentUrl);
    }
  };

  const handleBack = async () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousUrl = history[newIndex];
      
      setHistoryIndex(newIndex);
      setIsLoading(true);
      try {
        const response = await fetch("/api/fetch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: previousUrl,
            sendAcceptMd: settings.sendAcceptMd,
            autoConvert: settings.autoConvert,
          }),
        });

        const data = await response.json();
        setContent(data);
        setCurrentUrl(data.url);
        setUrl(data.url);
      } catch (error) {
        console.error("Fetch error:", error);
        setContent({
          url: previousUrl,
          markdown: `# Error\n\nFailed to load: ${previousUrl}\n\n${error}`,
          rawHtml: "",
          title: "Error",
          wasMarkdown: false,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleHome = () => {
    setContent(null);
    setCurrentUrl("");
    setUrl("");
    setViewMode("preview");
    setHistory([]);
    setHistoryIndex(-1);
  };

  const handleVisit = (link: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setUrl(link);
    const normalized = normalizeUrl(link);
    if (normalized) fetchPage(normalized);
  };

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest("a") as HTMLAnchorElement | null;
    if (!anchor) return;

    const href = anchor.href;
    if (!href) return;

    // allow certain links to open in a new tab instead of internal routing
    const allowList = ["haydenso.com", "turndown", "98.css"];
    if (allowList.some((s) => href.includes(s))) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      return;
    }

    e.preventDefault();
    handleVisit(href);
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="loading-indicator">Loading...</div>;
    }

    if (!content) {
      return (
        <div className="content-markdown">
          <h1>
            <img src="/windows.png" alt="Windows" className="logo" />
            98 Browser
          </h1>
          <p>see the world in the eyes of codex (or claude...)</p>

          <p>
            enter a URL to browse the web in markdown format. inspired by {" "}
            <a
              href="https://github.com/needle-tools/md-browse#"
              target="_blank"
              rel="noopener noreferrer"
            >
              md-browser
            </a>
          </p>
        <br></br>
          <p>
            sample websites: {" "}
            <a href="#" onClick={(e) => handleVisit("https://vercel.com/docs", e)}>
              vercel.com/docs
            </a>
          </p>

          <h2>features</h2>
          <ul>
            <li>converts web pages to markdown via <a href="https://github.com/mixmark-io/turndown" target="_blank" rel="noopener noreferrer">turndown (github)</a></li>
            <li>windows 98 retro design <a href="https://en.wikipedia.org/wiki/Windows_98" target="_blank" rel="noopener noreferrer">(98.css)</a></li>
          </ul>
          <br></br>   
          <p>
            built by {" "}
            <a href="https://haydenso.com" target="_blank" rel="noopener noreferrer">hayden</a>
          </p>
        </div>
      );
    }

    if (viewMode === "markdown") {
      return <div className="content-raw">{content.markdown}</div>;
    }

    if (viewMode === "html" && content.rawHtml) {
      return (
        <iframe
          ref={iframeRef}
          className="content-iframe"
          srcDoc={content.rawHtml}
          title="HTML View"
          sandbox="allow-same-origin allow-popups"
        />
      );
    }

    // Preview mode
    const html = renderMarkdown(content.markdown, content.url);
    return (
      <div
        className="content-markdown"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  return (
    <div className="app-container">
      <div className="window">
        <div className="title-bar">
          <div className="title-bar-text">
            windows 98 markdown browser
          </div>
          <div className="title-bar-controls">
            <button aria-label="Minimize"></button>
            <button aria-label="Maximize"></button>
            <button aria-label="Close"></button>
          </div>
        </div>

        <div className="window-body">
          <div className="toolbar">
            <div className="toolbar-group">
              <button onClick={handleHome}>
                <img src="/windows.png" alt="Home" className="btn-icon" />
                Home
              </button>
              <button onClick={handleReload} disabled={!currentUrl}>
                Reload
              </button>
            </div>

            <form onSubmit={handleSubmit} className="url-input-container">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL..."
                style={{ flex: 1 }}
              />
              <button type="submit" aria-label="Go" title="Go">
                <img src="/go.png" alt="Go" className="btn-icon" />
                Enter
              </button>
              <button 
                type="button" 
                onClick={handleBack} 
                disabled={historyIndex <= 0}
                aria-label="Back"
                title="Back"
              >
                <img src="/back.png" alt="Back" className="btn-icon" />
                Back
              </button>
            </form>

            <div className="toolbar-group">
              <button
                onClick={() => setViewMode("preview")}
                disabled={viewMode === "preview"}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode("markdown")}
                disabled={viewMode === "markdown"}
              >
                Markdown
              </button>
              {content && !content.wasMarkdown && (
                <button
                  onClick={() => setViewMode("html")}
                  disabled={viewMode === "html"}
                >
                  HTML
                </button>
              )}
            </div>
          </div>

          <div className="content-area" onClick={handleContentClick}>{renderContent()}</div>

          <div className="status-bar">
            <div className="status-bar-field flex-1">
              {currentUrl || "Ready"}
            </div>
            {content && (
              <div className="status-bar-field">
                {content.wasMarkdown ? "Native MD" : "HTML→MD"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
