import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SoundGuessr - Guess the Place by its Soundscape",
  description:
    "Listen to AI-generated soundscapes and guess where and when you are. Built with turbopuffer + ElevenLabs for #ElevenHacks.",
  openGraph: {
    title: "SoundGuessr",
    description: "Can you guess where you are... just by listening?",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: "#0a0a1a" }}>
        {children}
      </body>
    </html>
  );
}
