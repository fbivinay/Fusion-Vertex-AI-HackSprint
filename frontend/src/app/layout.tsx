import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/site-chrome";

const geist = Geist({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Fusion Vertex AI — Requirements Intelligence",
  description: "Turn fragmented business information into trusted, evidence-linked requirements with Fusion Vertex AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={geist.variable + " " + geistMono.variable}>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
