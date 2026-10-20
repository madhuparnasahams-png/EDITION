import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";
import SiteFooter from "@/components/SiteFooter";
import { siteUrl, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Edition: a newsstand for independent creators", template: "%s | Edition" },
  description: "A newsstand that knows you, and learns you, because it trusts your taste. Read and publish articles, audio and video.",
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website", description: SITE_TAGLINE },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  verification: { google: "SdMyQuzzPLH8DOBABpOes3Wo_RpLh-C6l-rAspYllHI" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Playfair+Display:wght@400;500&family=Lora:wght@400;500&family=Cormorant+Garamond:wght@400;500&family=Special+Elite&family=Caveat:wght@400;500&display=swap" rel="stylesheet" />
        </head>
        <body className="bg-white text-black dark:bg-black dark:text-white transition-colors">
          <ThemeProvider>
            {children}
            <SiteFooter />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
