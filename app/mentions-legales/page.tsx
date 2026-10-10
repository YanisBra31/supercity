import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "../components/LegalPage";
import { hebergeur, legal } from "../legal";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergeur et conditions d'utilisation du site supercity.fr.",
  alternates: { canonical: "/mentions-legales/" },
};

export default function MentionsLegales() {
  return (
    <LegalPage title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        Le site supercity.fr est édité par {legal.editeur}, {legal.statut}.
        <br />
        Adresse : {legal.adresse}
        {legal.siret && (
          <>
            <br />
            SIRET : {legal.siret}
          </>
        )}
        <br />
        Contact : <a href={`mailto:${legal.email}`}>{legal.email}</a>
      </p>
      <p>Directeur de la publication : {legal.directeurPublication}.</p>

      <h2>Hébergeur</h2>
      <p>
        {hebergeur.nom}
        <br />
        {hebergeur.adresse}
        <br />
        <a href={hebergeur.site}>{hebergeur.site.replace("https://", "")}</a>
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le nom Supercity, l&apos;écusson, les textes, les visuels et la mise en page de ce site sont la propriété de
        leur éditeur. Toute reproduction, totale ou partielle, sans autorisation écrite préalable est interdite.
      </p>

      <h2>Données personnelles et cookies</h2>
      <p>
        Les adresses e-mail laissées sur ce site servent uniquement à prévenir de la sortie de l&apos;appli. Le détail
        de leur traitement et de tes droits est expliqué dans la{" "}
        <Link href="/confidentialite/">politique de confidentialité</Link>. Ce site ne dépose aucun cookie de suivi ni
        de publicité.
      </p>

      <p className="legal__updated">Dernière mise à jour : {legal.derniereMiseAJour}.</p>
    </LegalPage>
  );
}
