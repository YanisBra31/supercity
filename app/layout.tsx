import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://supercity.fr"),
  title: "Supercity · Le foot amateur, partout, sur tous les terrains",
  description:
    "Crée ton équipe, organise tes matchs city, futsal, 8 vs 8 ou 11 vs 11, et trouve des joueurs près de chez toi.",
  openGraph: {
    title: "Supercity",
    description: "Crée ton équipe. Organise tes matchs. Partout, sur tous les terrains.",
    url: "https://supercity.fr",
    siteName: "Supercity",
    locale: "fr_FR",
    type: "website",
    images: ["/affiche.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ff5223",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={poppins.className}>{children}</body>
    </html>
  );
}
