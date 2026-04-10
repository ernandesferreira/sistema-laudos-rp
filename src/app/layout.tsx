import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Sora, Barlow_Condensed } from "next/font/google";
import { BRAND_SETTINGS_COOKIE_KEY, parseBrandSettings } from "@/lib/brandSettings";
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
  "Ambiente ficticio RP para investigacao e organizacao de solicitacoes. Nao use para processos reais.";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const brand = parseBrandSettings(cookieStore.get(BRAND_SETTINGS_COOKIE_KEY)?.value ?? null);

  return {
    title: brand.systemName,
    description:
      "Plataforma ficticia para criar modelos de solicitacao e receber submisses em ambiente RP.",
    icons: brand.logoUrl
      ? {
          icon: brand.logoUrl,
          shortcut: brand.logoUrl,
          apple: brand.logoUrl,
        }
      : undefined,
  };
}

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
        <div className="border-b border-slate-800 bg-slate-950/90 px-4 py-2 text-center text-xs font-medium text-slate-300 md:text-sm">
          {fictitiousNotice}
        </div>
        {children}
      </body>
    </html>
  );
}
