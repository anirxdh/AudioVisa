import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-kid",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://audiovisa.vercel.app"
  ),
  title: "Audio Visa — Learn Animal Sounds",
  description:
    "A playful audio game for little kids (ages 1–3). Listen to a sound, tap the animal, earn stickers. Built with ElevenLabs + turbopuffer.",
  openGraph: {
    title: "Audio Visa — Learn Animal Sounds",
    description: "Playful sound quiz for toddlers.",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Audio Visa — Learn Animal Sounds",
    description: "Playful sound quiz for toddlers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
