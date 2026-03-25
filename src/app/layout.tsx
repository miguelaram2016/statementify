import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Statementify",
  description:
    "Convert PDF bank statements into reviewable transaction exports for CSV, Excel, JSON, OFX/QFX, and QIF.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
