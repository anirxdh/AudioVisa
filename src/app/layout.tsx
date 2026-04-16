import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://junglesafari.netlify.app"
  ),
  title: "Jungle Safari — Learn Animal Sounds",
  description:
    "A playful audio expedition for little explorers (ages 1–3). Hear the sound, tap the animal, collect safari badges. Built with ElevenLabs + turbopuffer.",
  openGraph: {
    title: "Jungle Safari — Learn Animal Sounds",
    description: "Hear it. Tap it. Collect safari badges.",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jungle Safari — Learn Animal Sounds",
    description: "Hear it. Tap it. Collect safari badges.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
