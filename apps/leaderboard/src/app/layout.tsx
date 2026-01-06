import type { Metadata } from "next";
import { Cinzel, Playfair_Display } from "next/font/google";
import "./globals.css";
import AutoRotate from "@/components/AutoRotate";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'League of Stars'

export const metadata: Metadata = {
  title: `${systemName} Leaderboard`,
  description: "Where Stars Are Made",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${playfair.variable} antialiased`}>
        <AutoRotate />
        {children}
      </body>
    </html>
  );
}
