import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Statementify | Bank statement PDF to export converter",
  description:
    "Convert PDF bank statements into reviewable transaction exports for CSV, Excel, JSON, OFX/QFX, and QIF.",
  metadataBase: new URL("https://statementify.vercel.app"),
  openGraph: {
    title: "Statementify",
    description:
      "Turn bank statement PDFs into clean, reviewable transaction exports in your browser.",
    url: "https://statementify.vercel.app",
    siteName: "Statementify",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Statementify",
    description:
      "Turn bank statement PDFs into clean, reviewable transaction exports in your browser.",
  },
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
