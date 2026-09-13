import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoAlerta - Ocorrências",
  description: "Sistema PWA para relato rápido de ocorrências na cidade.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
