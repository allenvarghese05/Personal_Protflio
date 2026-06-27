import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
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
  weight: ["400", "500"],
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
  themeColor: "#030014",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
