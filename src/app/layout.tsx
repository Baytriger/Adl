import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme";
import "./globals.css";

// Inter variable font (SIL OFL 1.1, see src/fonts/OFL-LICENSE.txt), self-hosted and preloaded.
const inter = localFont({
  src: "../fonts/Inter-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: {
    default: "ADL | Members, events and media in one workspace",
    template: "%s | ADL",
  },
  description:
    "ADL brings member records, event attendance and media page data into one signed-in workspace with shared metrics and reports.",
  openGraph: {
    type: "website",
    siteName: "ADL",
    title: "ADL | Members, events and media in one workspace",
    description:
      "Member records, event attendance and media page data in one signed-in workspace.",
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1013" },
  ],
};

// Runs before first paint so the stored or system theme is applied without a flash.
const themeScript = `(function(){try{var t=localStorage.getItem("adl-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
