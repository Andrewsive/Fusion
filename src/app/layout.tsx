import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fusion Space MVP",
  description: "AI-powered team collaboration hub"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
