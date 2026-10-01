import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Fusion Vertex AI — Requirements Intelligence",
  description: "Traceable business requirements, cross-source evidence, and human decisions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geist.variable + " " + geistMono.variable}>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var k="fusion-cover",n=Date.now(),t=+localStorage.getItem(k)||0,h=document.documentElement;' +
              'if(n-t<216e5){h.setAttribute("data-no-cover","");h.setAttribute("data-entered","")}' +
              'else localStorage.setItem(k,String(n))}catch(e){}})()',
          }}
        />
        {children}
      </body>
    </html>
  );
}
