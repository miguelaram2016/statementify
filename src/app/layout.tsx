import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Statementify - Bank Statement Converter",
  description: "Convert bank statements (PDFs, scans) to CSV, Excel, JSON, OFX/QFX, QIF formats",
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
