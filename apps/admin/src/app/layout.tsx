import type { Metadata } from "next";
import "./globals.css";

// Metadata uses env vars since it's generated at build time
const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'League of Stars'
const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME || 'Demo Academy'

export const metadata: Metadata = {
  title: `${systemName} Admin`,
  description: `Admin Dashboard for ${schoolName}`,
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
