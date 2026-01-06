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

// Metadata uses env vars since it's generated at build time
const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'League of Stars'
const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME || 'Demo Academy'

export const metadata: Metadata = {
  title: systemName,
  description: `${systemName} web experience for ${schoolName}`,
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
