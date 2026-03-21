import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KMS - Knowledge Management System",
  description: "Kolaborativni platforma pro tymy + AI agenty",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
