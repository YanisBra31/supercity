import Image from "next/image";
import Link from "next/link";
import Footer from "./Footer";

// Gabarit des pages légales : barre de navigation simple, texte lisible, pied de page commun.
export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="nav nav--simple">
        <Link className="nav__brand" href="/" aria-label="Supercity, accueil">
          <Image src="/logo-blanc.png" alt="" width={34} height={42} />
          <span>Supercity</span>
        </Link>
        <Link className="nav__cta" href="/#rejoindre">
          Rejoindre
        </Link>
      </header>
      <main className="legal">
        <h1>{title}</h1>
        {children}
      </main>
      <Footer />
    </>
  );
}
