import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "League of Stars Admin",
  description: "Admin Dashboard for Brighter Horizon Academy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
