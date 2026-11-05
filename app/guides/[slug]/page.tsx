import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LegalPage from "../../components/LegalPage";
import { SITE_URL } from "../../legal";
import { articles, bySlug } from "../articles";

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = bySlug((await params).slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/guides/${a.slug}/` },
    openGraph: { title: a.title, description: a.description, url: `/guides/${a.slug}/`, type: "article" },
  };
}

export default async function Guide({ params }: { params: Promise<{ slug: string }> }) {
  const a = bySlug((await params).slug);
  if (!a) notFound();
  // Données structurées : article et fil d'Ariane, pour l'affichage dans les résultats de recherche.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: a.title,
        description: a.description,
        dateModified: a.updated,
        inLanguage: "fr-FR",
        author: { "@type": "Organization", name: "Supercity", url: SITE_URL },
        publisher: { "@type": "Organization", name: "Supercity", logo: { "@type": "ImageObject", url: `${SITE_URL}/logo-blanc.png` } },
        mainEntityOfPage: `${SITE_URL}/guides/${a.slug}/`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Guides", item: `${SITE_URL}/guides/` },
          { "@type": "ListItem", position: 2, name: a.title, item: `${SITE_URL}/guides/${a.slug}/` },
        ],
      },
    ],
  };
  const others = articles.filter((x) => x.slug !== a.slug).slice(0, 3);
  return (
    <LegalPage title={a.title}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="guides__crumbs">
        <Link href="/guides/">Guides</Link> › {a.title}
      </p>
      {a.body}
      <h2>À lire aussi</h2>
      <ul>
        {others.map((x) => (
          <li key={x.slug}>
            <Link href={`/guides/${x.slug}/`}>{x.title}</Link>
          </li>
        ))}
      </ul>
    </LegalPage>
  );
}
