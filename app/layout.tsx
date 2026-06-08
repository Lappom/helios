import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { clerkAppearance } from "@/lib/clerk/appearance";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Helios",
  description: "Plateforme SaaS de coaching sportif",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn(inter.variable, jetbrainsMono.variable, "font-sans")}>
      <body className="min-h-screen bg-canvas font-sans text-body antialiased">
        <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
        <SpeedInsights />
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
