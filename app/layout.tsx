import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Log Collector Playground",
  description: "Try Vector, Fluent Bit, and Fluentd configs in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
