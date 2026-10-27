import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CrowTrans",
  description:
    "CrowTrans recognises crow, raven, rook and jackdaw calls on-device and logs what each call most likely means. Audio never leaves the browser.",
  applicationName: "CrowTrans",
  keywords: ["CrowTrans", "crow", "raven", "corvid", "bioacoustics", "BirdNET"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "CrowTrans",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col ct-backdrop">{children}</body>
    </html>
  );
}
