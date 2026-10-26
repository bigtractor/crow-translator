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
  title: "Corvus-Edge | Real-Time Bioacoustic Acoustic Inference Node",
  description:
    "Simulating a physical bioacoustic edge node for real-time Corvus corone detection and behavioral translation using BirdNET and WebAssembly client-side inference on Vercel.",
  keywords: [
    "Bioacoustics",
    "BirdNET",
    "Corvus corone",
    "TensorFlow.js",
    "WebAssembly",
    "Edge AI",
    "Vercel",
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
        <meta name="apple-mobile-web-app-title" content="Corvus-Edge" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className="min-h-full bg-[#05080c] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
