import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SoundGuessr - Guess the Sound, Find the Place",
  description:
    "Can you guess where you are just by listening? AI-generated soundscapes challenge your ears. Built with turbopuffer + ElevenLabs.",
  openGraph: {
    title: "SoundGuessr",
    description: "Can you guess where you are just by listening?",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SoundGuessr",
    description: "Can you guess where you are just by listening?",
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
