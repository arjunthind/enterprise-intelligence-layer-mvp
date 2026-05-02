import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Enterprise Intelligence Layer MVP",
  description: "A governed AI orchestration prototype for enterprise HR policy support."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
