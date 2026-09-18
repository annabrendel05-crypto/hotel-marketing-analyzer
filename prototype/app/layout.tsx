import type { Metadata } from "next";
import { Geist_Mono, Lato, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hotel Campaign Intelligence — prototyp",
  description: "Diagnostyka kampanii i ścieżki rezerwacyjnej Hotelu X.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body className={`${lato.variable} ${playfairDisplay.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
