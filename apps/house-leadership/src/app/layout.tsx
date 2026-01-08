import type { Metadata } from "next";
import { Cormorant_Garamond, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
});

const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || "League of Stars";
const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME || "Brighter Horizon Academy";

export const metadata: Metadata = {
  title: `${systemName} House Leadership`,
  description: `House leadership dashboard for ${schoolName}`,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${playfair.variable} ${cormorant.className} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
