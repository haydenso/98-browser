import type { Metadata } from "next";
import "98.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "windows 98 markdown browser",
  description: "view the web through the eyes of claude.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/windows.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
