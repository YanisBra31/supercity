import Image from "next/image";
import Link from "next/link";
import Footer from "./Footer";

// Gabarit des pages légales : barre de navigation simple, texte lisible, pied de page commun.
export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="nav nav--simple">
        <Link className="nav__brand" href="/decouvrir/" aria-label="Supercity, présentation">
          <Image src="/logo-blanc.png" alt="" width={34} height={42} />
          <span>Supercity</span>
        </Link>
        <a className="nav__cta" href="/app/">
          Ouvrir l&apos;appli
        </a>
      </header>
      <main className="legal">
        <h1>{title}</h1>
        {children}
      </main>
      <Footer />
    </>
  );
}
