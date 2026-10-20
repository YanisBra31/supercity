import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "../components/LegalPage";
import { articles } from "./articles";

export const metadata: Metadata = {
  title: "Guides du foot amateur : règles, organisation, équipes",
  description:
    "Les règles du foot city et du futsal, comment organiser un match, monter son équipe ou trouver des joueurs : les guides Supercity du foot amateur.",
  alternates: { canonical: "/guides/" },
};

export default function Guides() {
  return (
    <LegalPage title="Guides du foot amateur">
      <p>Règles, organisation, équipe : tout ce qu&apos;il faut savoir pour jouer plus souvent, et mieux.</p>
      <ul className="guides">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={`/guides/${a.slug}/`}>{a.title}</Link>
            <span>{a.description}</span>
          </li>
        ))}
      </ul>
      <p>
        Et pour jouer : <a href="/foot/">les terrains et matchs ville par ville</a>.
      </p>
    </LegalPage>
  );
}
