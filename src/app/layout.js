import { Geist, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Display face — Geist: tight, editorial, not the default "tech" grotesk
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  title: "Allen Shaji Varghese — Mission Control",
  description:
    "Software Engineering student at Drexel building products that solve real problems through AI and technology. An immersive journey through the work of Allen Shaji Varghese.",
  openGraph: {
    title: "Mission Allen — Allen Shaji Varghese",
    description:
      "An immersive space odyssey through the engineering and creative work of Allen Shaji Varghese.",
    type: "website",
  },
  metadataBase: new URL("https://allenvarghese.com"),
};

export const viewport = {
  themeColor: "#07080c",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
