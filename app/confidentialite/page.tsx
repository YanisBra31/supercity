import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";
import { hebergeur, legal } from "../legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Quelles données Supercity collecte sur supercity.fr, pourquoi, combien de temps, et comment exercer tes droits.",
  alternates: { canonical: "/confidentialite/" },
};

export default function Confidentialite() {
  return (
    <LegalPage title="Politique de confidentialité">
      <p>
        Cette page explique quelles données personnelles sont collectées sur supercity.fr et ce qu&apos;on en fait.
        En bref : on garde seulement ton e-mail, pour te prévenir quand l&apos;appli sort, et tu peux le faire supprimer
        à tout moment.
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        {legal.editeur}, {legal.adresse}.
        <br />
        Contact : <a href={`mailto:${legal.email}`}>{legal.email}</a>
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>Ton adresse e-mail, si tu t&apos;inscris à la liste d&apos;attente.</li>
        <li>La date et l&apos;heure de ton inscription.</li>
      </ul>
      <p>
        Comme tout site web, l&apos;hébergeur enregistre aussi des journaux techniques (adresse IP, pages demandées,
        navigateur) pour assurer la sécurité et le bon fonctionnement du serveur. Ils ne servent pas à te suivre.
      </p>

      <h2>Pourquoi et sur quelle base</h2>
      <p>
        Ton e-mail sert uniquement à t&apos;envoyer des nouvelles du lancement de l&apos;appli Supercity : sa sortie,
        l&apos;ouverture des inscriptions, et éventuellement une invitation à la tester en avant-première. Ce traitement
        repose sur ton consentement (article 6.1.a du RGPD), que tu donnes en cochant la case du formulaire. Ton
        adresse n&apos;est jamais vendue, louée ni cédée à qui que ce soit.
      </p>

      <h2>Durée de conservation</h2>
      <p>
        Ton e-mail est conservé jusqu&apos;au lancement de l&apos;appli, puis au plus 12 mois après, sauf si tu crées un
        compte entre-temps ou si tu demandes sa suppression avant. Les journaux techniques de l&apos;hébergeur sont
        conservés au plus 12 mois.
      </p>

      <h2>Qui y a accès</h2>
      <p>
        Seule l&apos;équipe Supercity. Les données sont stockées chez notre hébergeur, {hebergeur.nom} ({hebergeur.adresse}),
        qui agit comme sous-traitant et ne les utilise pas pour son propre compte. Elles restent dans l&apos;Union
        européenne.
      </p>

      <h2>Tes droits</h2>
      <p>
        Tu peux à tout moment accéder à tes données, les faire corriger ou supprimer, retirer ton consentement,
        t&apos;opposer au traitement, en demander la limitation ou la portabilité. Il suffit d&apos;écrire à{" "}
        <a href={`mailto:${legal.email}`}>{legal.email}</a> ; on te répond sous un mois. Chaque e-mail qu&apos;on
        t&apos;enverra contiendra aussi un lien pour te désinscrire.
      </p>
      <p>
        Si tu estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la CNIL sur{" "}
        <a href="https://www.cnil.fr/fr/plaintes">cnil.fr</a>.
      </p>

      <h2>Mineurs</h2>
      <p>Si tu as moins de 15 ans, demande l&apos;accord d&apos;un de tes parents avant de laisser ton e-mail.</p>

      <h2>Cookies</h2>
      <p>
        Ce site ne dépose aucun cookie, ni de mesure d&apos;audience, ni de publicité, et ne charge aucun service tiers
        (les polices sont servies par le site lui-même). Si cela change, cette page sera mise à jour et ton accord
        sera demandé avant tout dépôt de cookie non essentiel.
      </p>

      <p className="legal__updated">Dernière mise à jour : {legal.derniereMiseAJour}.</p>
    </LegalPage>
  );
}
