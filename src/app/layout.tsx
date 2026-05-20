import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MTG Testing Annotator",
  description: "Team video review for Magic: The Gathering decisions"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
