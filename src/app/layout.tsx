import type { Metadata } from "next";
import { Sora, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const fictitiousNotice =
  "Sistema ficticio para roleplay (RP). Nao use para processos reais.";

export const metadata: Metadata = {
  title: "Sistema de Laudos RP",
  description:
    "Plataforma ficticia para criar modelos de laudos e receber submisses em ambiente RP.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-app text-ink">
        <div className="border-b border-brand-200 bg-brand-100/80 px-4 py-2 text-center text-xs font-medium text-brand-900 md:text-sm">
          {fictitiousNotice}
        </div>
        {children}
      </body>
    </html>
  );
}
