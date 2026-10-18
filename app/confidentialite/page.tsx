import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";
import { hebergeur, legal } from "../legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données Supercity collecte sur le site et dans l'appli, pourquoi, combien de temps, avec qui, et comment exercer tes droits.",
  alternates: { canonical: "/confidentialite/" },
};

export default function Confidentialite() {
  return (
    <LegalPage title="Politique de confidentialité">
      <p>
        Cette page explique quelles données personnelles Supercity collecte sur le site supercity.fr et dans
        l&apos;appli Supercity, ce qu&apos;on en fait et comment tu gardes la main dessus. En bref : on garde ce
        qu&apos;il faut pour faire tourner l&apos;appli, rien n&apos;est vendu ni utilisé pour de la publicité, et tu
        peux récupérer ou supprimer tes données depuis l&apos;appli.
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        {legal.editeur}, {legal.adresse}.
        <br />
        Contact : <a href={`mailto:${legal.email}`}>{legal.email}</a>
      </p>

      <h2>Sur le site : la liste d&apos;attente</h2>
      <p>
        Si tu t&apos;inscris à la liste d&apos;attente, on garde ton adresse e-mail et la date de ton inscription,
        uniquement pour te prévenir de la sortie de l&apos;appli et éventuellement t&apos;inviter à la tester. Ce
        traitement repose sur ton consentement (article 6.1.a du RGPD), que tu donnes en cochant la case du
        formulaire. Ton adresse est conservée jusqu&apos;au lancement de l&apos;appli, puis au plus 12 mois, sauf si tu
        crées un compte ou demandes sa suppression avant. Chaque e-mail contient un lien pour te désinscrire.
      </p>

      <h2>Dans l&apos;appli : ce qu&apos;on collecte et pourquoi</h2>
      <ul>
        <li>
          <strong>Ton compte</strong> : e-mail, mot de passe (chiffré, on ne le connaît pas), pseudo et date de
          naissance (jamais affichée, elle sert à vérifier que tu as au moins 15 ans). Base : l&apos;exécution du
          service que tu demandes en créant ton compte (article 6.1.b).
        </li>
        <li>
          <strong>Ton profil</strong>, si tu le remplis : photo, ville, poste, niveau, pied fort, numéro, club préféré,
          bio, estimation de ta carte joueur. Il est visible par les autres joueurs. Base : exécution du service.
        </li>
        <li>
          <strong>Ton activité</strong> : matchs rejoints ou organisés, équipes, défis, scores, publications,
          commentaires, « j&apos;aime », notes données et reçues après les matchs, grade, pièces et objets de la
          boutique, amis et demandes d&apos;ami, notifications reçues dans l&apos;appli. Base : exécution du service.
        </li>
        <li>
          <strong>Ton statut</strong> : l&apos;heure de ta dernière activité dans l&apos;appli. Avec tes matchs, elle permet
          de montrer à tes amis, et à eux seuls, si tu es en ligne ou en match. Tu peux le cacher à tout moment dans les
          Réglages. Base : exécution du service.
        </li>
        <li>
          <strong>Ta position</strong>, seulement si tu l&apos;autorises : elle sert à chercher les matchs proches et
          n&apos;est pas enregistrée dans notre base. Si tu actives les notifications, on garde une position approchée (à 1 km
          près) pour t&apos;alerter de ce qui se passe près de chez toi. Base : ton consentement, que tu retires en
          coupant la localisation ou les notifications.
        </li>
        <li>
          <strong>Les paiements</strong> des matchs payants : montant, date, statut et remboursements. Tes
          coordonnées bancaires sont saisies chez Stripe ; Supercity ne les voit jamais. Base : exécution du service et
          obligations comptables (article 6.1.c).
        </li>
        <li>
          <strong>La sécurité</strong> : les tentatives de connexion (adresse IP, e-mail) pour bloquer les attaques,
          les codes de confirmation envoyés par e-mail, et les signalements de contenus. Base : notre intérêt
          légitime à protéger les comptes et la communauté (article 6.1.f).
        </li>
        <li>
          <strong>Les espaces pro</strong> (fives, clubs, associations, coachs) : nom et type de la structure, ville ;
          les informations légales et bancaires sont données directement à Stripe pour les virements.
        </li>
      </ul>
      <p>
        Tes données ne sont ni vendues, ni louées, ni utilisées pour de la publicité. L&apos;appli n&apos;utilise pas
        d&apos;outil de mesure d&apos;audience ni de traceur publicitaire.
      </p>

      <h2>Combien de temps</h2>
      <ul>
        <li>Ton compte et ton activité : tant que ton compte existe. Quand tu le supprimes, ils sont effacés.</li>
        <li>
          Les paiements : 10 ans, comme l&apos;impose le Code de commerce, sans ton nom ni ton e-mail une fois ton
          compte supprimé.
        </li>
        <li>Les notifications dans l&apos;appli : 90 jours.</li>
        <li>Les tentatives de connexion : 2 jours. Les codes envoyés par e-mail : 30 minutes.</li>
        <li>Les sessions de connexion : 60 jours au plus, ou jusqu&apos;à ta déconnexion.</li>
        <li>Les journaux techniques de l&apos;hébergeur : 12 mois au plus.</li>
      </ul>

      <h2>Avec qui</h2>
      <p>
        Seule l&apos;équipe Supercity a accès à tes données, et les modérateurs voient ce qui est nécessaire pour
        traiter un signalement. Nos prestataires (sous-traitants) ne les utilisent que pour nous rendre service :
      </p>
      <ul>
        <li>
          {hebergeur.nom} ({hebergeur.adresse}) : hébergement du site, de l&apos;API, de la base de données et envoi des
          e-mails. Les données sont stockées dans l&apos;Union européenne.
        </li>
        <li>
          Stripe Payments Europe (Irlande) : paiements et virements aux organisateurs. Stripe peut transférer des
          données aux États-Unis, encadrées par les clauses contractuelles types de la Commission européenne.
        </li>
        <li>
          Expo (États-Unis), Apple et Google : acheminement des notifications sur ton téléphone, si tu les actives.
          Transferts encadrés par les clauses contractuelles types ou le cadre de protection des données UE-États-Unis.
        </li>
        <li>
          La Géoplateforme de l&apos;IGN (France) : quand tu tapes une adresse pour ajouter un terrain, le texte saisi
          lui est envoyé pour trouver le lieu.
        </li>
        <li>
          Apple (Plans) ou Google (Maps) : affichage de la carte des terrains sur ton téléphone.
        </li>
      </ul>

      <h2>Tes droits</h2>
      <p>
        Tu peux accéder à tes données, les corriger, les supprimer, en demander la portabilité, t&apos;opposer à un
        traitement, en demander la limitation et retirer ton consentement à tout moment. Dans l&apos;appli, va dans
        Réglages, puis « Mes données et mon compte » :
      </p>
      <ul>
        <li>« M&apos;envoyer mes données » t&apos;envoie une copie complète, dans un fichier lisible.</li>
        <li>« Supprimer mon compte » efface ton compte pour de bon, après confirmation de ton mot de passe.</li>
        <li>Ton profil se corrige à tout moment avec « Modifier ».</li>
      </ul>
      <p>
        Tu peux aussi écrire à <a href={`mailto:${legal.email}`}>{legal.email}</a> ; on te répond sous un mois. Si tu
        estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la CNIL sur{" "}
        <a href="https://www.cnil.fr/fr/plaintes">cnil.fr</a>.
      </p>

      <h2>Sécurité</h2>
      <p>
        Les échanges avec l&apos;appli sont chiffrés (HTTPS), les mots de passe sont chiffrés de façon irréversible, les
        tentatives de connexion sont limitées et ta session est gardée dans l&apos;espace sécurisé de ton téléphone. En
        cas de fuite de données présentant un risque pour toi, on te prévient, ainsi que la CNIL.
      </p>

      <h2>Mineurs</h2>
      <p>
        Il faut avoir au moins 15 ans pour créer un compte (majorité numérique en France). Pour la liste
        d&apos;attente, si tu as moins de 15 ans, demande l&apos;accord d&apos;un de tes parents.
      </p>

      <h2>Cookies</h2>
      <p>
        Le site ne dépose aucun cookie, ni de mesure d&apos;audience, ni de publicité, et ne charge aucun service tiers
        (les polices sont servies par le site lui-même). Si cela change, cette page sera mise à jour et ton accord
        sera demandé avant tout dépôt de cookie non essentiel.
      </p>

      <h2>Changements</h2>
      <p>
        Si cette politique change de façon importante, tu seras prévenu dans l&apos;appli avant que le changement
        s&apos;applique.
      </p>

      <p className="legal__updated">Dernière mise à jour : {legal.derniereMiseAJour}.</p>
    </LegalPage>
  );
}
