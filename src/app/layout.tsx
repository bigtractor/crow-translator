import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Calcaine | Real-Time Crow Bioacoustic Translation",
  description:
    "Real-time bioacoustic translation for Carrion Crows (Corvus corone). Client-side neural translation powered by Web Audio API and WebAssembly.",
  keywords: [
    "Calcaine",
    "Crow Translator",
    "Corvus corone",
    "Bioacoustics",
    "BirdNET",
    "Animal Communication",
    "Edge AI",
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
      className={`${inter.variable} ${robotoMono.variable} dark h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Calcaine" />
        <meta name="theme-color" content="#080c0a" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className="min-h-full bg-[#080c0a] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
