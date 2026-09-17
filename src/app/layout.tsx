import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "vizarch — AI System Architecture Diagram Generator",
  description: "Describe your system in plain English. Get a professional SVG architecture diagram in seconds. 200+ cloud service icons (AWS, GCP, Azure, Kubernetes).",
  keywords: ["vizarch", "architecture diagram", "AWS", "GCP", "Azure", "Kubernetes", "Sugiyama", "Claude", "system design", "diagram generator"],
  authors: [{ name: "vizarch" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "vizarch — AI Architecture Diagram Generator",
    description: "Describe your system in plain English → get a professional SVG architecture diagram in seconds.",
    url: "https://vizarch.app",
    siteName: "vizarch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "vizarch — AI Architecture Diagram Generator",
    description: "Describe your system in plain English → get a professional SVG architecture diagram in seconds.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
