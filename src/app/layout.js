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

// The address link previews (Open Graph images, canonical URLs) resolve
// against. Set NEXT_PUBLIC_SITE_URL once a custom domain is live; on Vercel
// it otherwise follows the project's production address (its own domain, or
// the free *.vercel.app one), so previews work from the first deploy.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://allenvarghese.com");

export const metadata = {
  title: "Allen Shaji Varghese · Software Engineer",
  description:
    "Software engineering student at Drexel (’27). Giving infrastructure at Overflow, a grant platform in production across India, and a NASA Space Apps 2025 Global Nominee. Projects, case studies and contact.",
  openGraph: {
    title: "Allen Shaji Varghese · Software Engineer",
    description:
      "Giving infrastructure at Overflow, a grant platform in production across India, and a NASA Space Apps 2025 Global Nominee. Walk through the work in 3D, or read the case studies.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  metadataBase: new URL(SITE_URL),
};

export const viewport = {
  themeColor: "#07080c",
};

export default function RootLayout({ children }) {
  return (
    // /projects sets data-work-theme on <html> before React loads (its theme
    // script); that one attribute is expected to differ from the server's
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
