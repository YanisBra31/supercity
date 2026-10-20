import Link from "next/link";
import { CookieLink } from "./Ads";

export default function Footer() {
  return (
    <footer className="footer">
      <span>Créer ton équipe. Organiser tes matchs. Partout, sur tous les terrains.</span>
      <nav className="footer__links" aria-label="Informations légales">
        <Link href="/mentions-legales/">Mentions légales</Link>
        <Link href="/confidentialite/">Confidentialité</Link>
        <CookieLink />
        <span>© Supercity 2026</span>
      </nav>
    </footer>
  );
}
