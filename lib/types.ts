export type ViewMode = "markdown" | "preview" | "html";

export interface PageContent {
  url: string;
  markdown: string;
  rawHtml: string;
  title: string;
  wasMarkdown: boolean;
}

export interface BrowserSettings {
  sendAcceptMd: boolean;
  autoConvert: boolean;
}
