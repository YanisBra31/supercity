import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AdScript } from "./components/Ads";
import { SITE_URL } from "./legal";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
  display: "swap",
});

const description =
  "Crée ton équipe, organise tes matchs city, futsal, 8 vs 8 ou 11 vs 11, et trouve des joueurs près de chez toi.";
const ogImage = { url: "/affiche.jpg", width: 1598, height: 1122, alt: "Affiche Supercity « Rejoignez nous »" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Supercity · Le foot amateur, partout, sur tous les terrains",
    template: "%s · Supercity",
  },
  description,
  applicationName: "Supercity",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Supercity · Le foot amateur, partout, sur tous les terrains",
    description: "Crée ton équipe. Organise tes matchs. Partout, sur tous les terrains.",
    url: "/decouvrir/",
    siteName: "Supercity",
    locale: "fr_FR",
    type: "website",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Supercity · Le foot amateur, partout, sur tous les terrains",
    description: "Crée ton équipe. Organise tes matchs. Partout, sur tous les terrains.",
    images: [ogImage.url],
  },
};

// Données structurées : aident Google à afficher le nom et le logo du site dans ses résultats.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", name: "Supercity", url: SITE_URL, inLanguage: "fr-FR" },
    { "@type": "Organization", name: "Supercity", url: SITE_URL, logo: `${SITE_URL}/logo-blanc.png`, email: "contact@supercity.fr" },
    {
      "@type": "WebApplication",
      name: "Supercity",
      url: `${SITE_URL}/app/`,
      applicationCategory: "SportsApplication",
      operatingSystem: "Tous (navigateur web)",
      inLanguage: "fr-FR",
      description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    },
  ],
};

export const viewport: Viewport = {
  themeColor: "#ff5223",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <AdScript />
      </head>
      <body className={poppins.className}>
        {/* Active les animations seulement si le JS tourne : sans lui, tout reste visible. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
      </body>
    </html>
  );
}
