// Guides publics du foot amateur : de quoi répondre à ce que les joueurs cherchent sur Google,
// avec à chaque fois un lien vers l'appli et vers les terrains par ville.
import type { ReactNode } from "react";

export type Article = { slug: string; title: string; description: string; updated: string; body: ReactNode };

const App = ({ to = "/app/", children }: { to?: string; children: ReactNode }) => <a href={to}>{children}</a>;

export const articles: Article[] = [
  {
    slug: "regles-foot-city",
    title: "Les règles du foot city (city stade, 5 contre 5)",
    description:
      "Nombre de joueurs, gardien, durée, fautes, ballon qui touche la grille : les règles les plus courantes du foot en city stade, et comment les fixer avant le match.",
    updated: "2026-10-20",
    body: (
      <>
        <p>
          Le foot city se joue sur les terrains grillagés qu&apos;on trouve dans presque tous les quartiers : les city
          stades. Il n&apos;existe pas de règlement officiel, chaque terrain a ses habitudes. Voici celles qu&apos;on
          retrouve le plus souvent, pour partir sur de bonnes bases et éviter les embrouilles.
        </p>
        <h2>Combien de joueurs ?</h2>
        <p>
          Le format roi, c&apos;est le 5 contre 5, gardien compris. Sur les petits city stades, on joue aussi à 4 contre 4
          ou à 3 contre 3 sans gardien. Au-delà de 6 par équipe, le terrain devient trop petit et le jeu se résume à des
          mêlées. Les changements sont libres et illimités : celui qui sort tape dans la main de celui qui entre.
        </p>
        <h2>Le gardien</h2>
        <p>
          Trois formules existent : un gardien fixe, un gardien « tournant » (le dernier qui a encaissé va au but), ou
          pas de gardien du tout avec des petites cages. On fixe la règle avant le coup d&apos;envoi. Souvent, le gardien
          ne peut pas sortir de sa zone ni marquer directement depuis ses buts.
        </p>
        <h2>La grille et les sorties</h2>
        <p>
          Dans un city stade fermé, le ballon qui tape la grille reste en jeu : c&apos;est ce qui rend le jeu si rapide.
          S&apos;il passe par-dessus, l&apos;équipe adverse reprend au pied, à l&apos;endroit de la sortie. Les rentrées
          de touche à la main sont rares : on remet au pied.
        </p>
        <h2>Durée et score</h2>
        <ul>
          <li>Les « matchs en 2 » ou « en 3 » : la première équipe qui marque deux ou trois buts gagne et reste sur le terrain.</li>
          <li>Les matchs au temps : deux mi-temps de 15 à 20 minutes, pratique quand le terrain est réservé à l&apos;heure.</li>
          <li>Le « roi du terrain » : l&apos;équipe qui gagne reste, la suivante rentre.</li>
        </ul>
        <h2>Fautes, tacles et hors-jeu</h2>
        <p>
          Pas de hors-jeu en city. Les tacles glissés sont en général interdits : le sol est dur et la grille est proche.
          Une faute se joue en coup franc direct, sans mur ou avec un mur à trois pas. Comme il n&apos;y a pas
          d&apos;arbitre, c&apos;est celui qui subit la faute qui l&apos;annonce, et on joue franc-jeu.
        </p>
        <h2>Le bon réflexe : annoncer les règles avant</h2>
        <p>
          La plupart des tensions viennent de règles qui n&apos;ont pas été dites. Quand tu organises un match sur{" "}
          <App to="/app/create">Supercity</App>, écris-les dans la description : format, gardien, durée. Les joueurs qui
          s&apos;inscrivent savent à quoi s&apos;attendre.
        </p>
        <p>
          Envie de jouer ? Regarde <a href="/foot/">les terrains et les matchs près de chez toi</a>.
        </p>
      </>
    ),
  },
  {
    slug: "regles-futsal",
    title: "Les règles du futsal expliquées simplement",
    description:
      "Joueurs, durée, ballon, fautes cumulées, rentrée au pied, règle des 4 secondes : l'essentiel des règles du futsal pour jouer en salle sans prise de tête.",
    updated: "2026-10-20",
    body: (
      <>
        <p>
          Le futsal est la version officielle du foot en salle, avec son propre règlement (les Lois du jeu du futsal de la
          FIFA, reprises par la FFF). En loisir, on en garde surtout les grandes lignes. Les voici.
        </p>
        <h2>Le terrain et le ballon</h2>
        <p>
          On joue sur un sol de gymnase, avec des lignes de handball et des buts de 3 m sur 2 m. Le ballon est plus petit
          qu&apos;un ballon classique (taille 4) et rebondit beaucoup moins : il reste au sol et favorise les passes
          courtes.
        </p>
        <h2>Les joueurs</h2>
        <p>
          Cinq joueurs par équipe, dont un gardien. Les remplacements sont illimités et se font « à la volée », sans
          arrêter le jeu, dans la zone de changement devant son banc.
        </p>
        <h2>La durée</h2>
        <p>
          En compétition : deux mi-temps de 20 minutes de temps effectif (le chrono s&apos;arrête à chaque arrêt de jeu)
          et un temps mort par équipe et par mi-temps. En loisir, on joue souvent deux fois 20 à 25 minutes en temps
          courant.
        </p>
        <h2>Ce qui change par rapport au foot à 11</h2>
        <ul>
          <li>Pas de hors-jeu.</li>
          <li>Les touches se jouent au pied, ballon posé sur la ligne, en 4 secondes au plus.</li>
          <li>Le gardien relance à la main et dispose de 4 secondes quand il a le ballon dans sa moitié de terrain.</li>
          <li>Les corners se jouent aussi en 4 secondes.</li>
          <li>Les contacts sont très encadrés : un tacle ou une charge imprudente, c&apos;est faute.</li>
        </ul>
        <h2>Les fautes cumulées</h2>
        <p>
          Chaque équipe a droit à cinq fautes par mi-temps. À partir de la sixième, chaque nouvelle faute donne un coup
          franc direct sans mur, tiré depuis le second point de réparation, à 10 m du but. Le penalty, lui, se tire à
          6 m.
        </p>
        <h2>Où jouer ?</h2>
        <p>
          Les gymnases municipaux se réservent souvent par créneau via les associations, et certains complexes privés
          louent des terrains de futsal. Sur Supercity, choisis le format « Futsal » pour trouver ou{" "}
          <App to="/app/create">organiser un match en salle</App>, et parcours{" "}
          <a href="/foot/">les terrains par ville</a>.
        </p>
      </>
    ),
  },
  {
    slug: "city-futsal-foot-a-5-differences",
    title: "City, futsal, foot à 5 en salle : quelles différences ?",
    description:
      "Terrain, ballon, règles, ambiance et prix : comparatif du foot city, du futsal et du foot à 5 en salle pour choisir le format qui te va.",
    updated: "2026-10-20",
    body: (
      <>
        <p>
          On parle souvent de « foot à 5 » pour trois pratiques assez différentes. Petit tour d&apos;horizon pour savoir
          ce qui t&apos;attend.
        </p>
        <h2>Le foot city</h2>
        <p>
          Sur un city stade de quartier, en accès libre et gratuit. Terrain grillagé, sol synthétique ou en résine, le
          ballon qui tape la grille reste en jeu. Pas de règlement officiel, pas d&apos;arbitre, on joue entre potes ou
          avec ceux qui sont là. Idéal pour jouer souvent, sans réserver. Les règles habituelles sont dans notre guide{" "}
          <a href="/guides/regles-foot-city/">les règles du foot city</a>.
        </p>
        <h2>Le futsal</h2>
        <p>
          En gymnase, avec un ballon qui rebondit peu et un vrai règlement : pas de grille, touches au pied, fautes
          cumulées. C&apos;est le format le plus technique, et le seul qui ait des championnats officiels. Voir{" "}
          <a href="/guides/regles-futsal/">les règles du futsal</a>.
        </p>
        <h2>Le foot à 5 en salle (« five »)</h2>
        <p>
          Dans les complexes privés, sur gazon synthétique avec des parois ou des filets autour du terrain. On réserve un
          créneau d&apos;une heure, et le prix du terrain se partage entre les dix joueurs. Les règles
          varient selon le complexe : rebonds sur les parois autorisés, gardien qui ne sort pas de sa surface, pas de
          tacle.
        </p>
        <h2>Lequel choisir ?</h2>
        <ul>
          <li>Tu veux jouer souvent et gratuitement : le city stade.</li>
          <li>Tu aimes la technique et un cadre réglementé : le futsal.</li>
          <li>Tu veux un terrain réservé, à l&apos;abri, à heure fixe : le five.</li>
        </ul>
        <p>
          Sur Supercity, chaque match indique son format (city à 5, futsal, foot à 8, foot à 11) et son prix éventuel.{" "}
          <App>Ouvre l&apos;appli</App> pour voir ceux qui se jouent près de chez toi.
        </p>
      </>
    ),
  },
  {
    slug: "organiser-un-match-de-foot",
    title: "Comment organiser un match de foot entre potes",
    description:
      "Trouver un terrain, fixer l'heure, réunir assez de joueurs, gérer les désistements et le paiement : la méthode simple pour organiser un match de foot amateur.",
    updated: "2026-10-20",
    body: (
      <>
        <p>
          Organiser un match, c&apos;est souvent la partie la plus pénible : le groupe de discussion qui part dans tous
          les sens, les « je viens peut-être » et les absents de dernière minute. Voici une méthode qui marche.
        </p>
        <h2>1. Choisir le terrain d&apos;abord</h2>
        <p>
          Un city stade en accès libre ne coûte rien mais peut être occupé : vise les heures creuses ou viens tôt. Un five
          ou un gymnase se réserve à l&apos;avance. Regarde <a href="/foot/">les terrains déjà repérés dans ta ville</a>.
        </p>
        <h2>2. Fixer une heure et un format précis</h2>
        <p>
          « Mardi 19 h, city à 5, une heure » vaut mieux que « on se fait un foot cette semaine ? ». Un rendez-vous
          précis donne une décision simple à prendre : oui ou non.
        </p>
        <h2>3. Prévoir plus de joueurs que de places</h2>
        <p>
          Compte un ou deux désistements sur dix. Une liste d&apos;attente évite de courir après un remplaçant la veille.
        </p>
        <h2>4. Régler la question de l&apos;argent avant</h2>
        <p>
          Si le terrain est payant, annonce le prix par joueur dès le départ et fais payer à l&apos;inscription : ceux
          qui ont payé viennent.
        </p>
        <h2>5. Faire un rappel la veille</h2>
        <p>Un message la veille et une heure avant réduit beaucoup les absences.</p>
        <h2>Avec Supercity, c&apos;est fait pour toi</h2>
        <p>
          Quand tu <App to="/app/create">crées un match sur Supercity</App>, les places se remplissent en direct, la liste
          d&apos;attente prend le relais en cas de désistement, le paiement peut se faire dans l&apos;appli, et les
          joueurs du coin sont prévenus s&apos;il reste de la place. Il y a même une discussion de match pour se caler
          sur les chasubles.
        </p>
      </>
    ),
  },
  {
    slug: "creer-une-equipe-de-foot",
    title: "Monter son équipe de foot amateur : le guide",
    description:
      "Trouver des joueurs réguliers, choisir un nom et un maillot, organiser les créneaux et défier d'autres équipes : comment créer et faire vivre une équipe de foot amateur.",
    updated: "2026-10-20",
    body: (
      <>
        <p>
          Jouer toujours avec les mêmes, ça change tout : on se connaît, on progresse, et on peut défier d&apos;autres
          équipes. Voici comment lancer la tienne.
        </p>
        <h2>Partir d&apos;un noyau de 6 à 8 joueurs</h2>
        <p>
          Pour du foot à 5, un noyau de six à huit joueurs suffit : il y aura toujours un ou deux absents. Pour du foot à
          8, vise douze, et pour du foot à 11, une vingtaine.
        </p>
        <h2>Un nom, des couleurs</h2>
        <p>
          Ça paraît secondaire, mais un nom et des couleurs soudent le groupe. Un jeu de maillots ou de chasubles aux
          couleurs de l&apos;équipe fait aussi gagner du temps au moment de former les équipes.
        </p>
        <h2>Un créneau fixe</h2>
        <p>
          Le même jour à la même heure chaque semaine, c&apos;est ce qui fait durer une équipe. Les gens s&apos;organisent
          autour.
        </p>
        <h2>Jouer contre d&apos;autres équipes</h2>
        <p>
          Une fois l&apos;équipe rodée, les matchs contre une autre équipe du quartier sont le meilleur moteur. Un
          classement ou une série de victoires donne un objectif.
        </p>
        <h2>Sur Supercity</h2>
        <p>
          Tu peux <App to="/app/teams">créer ton équipe</App> avec son logo et ses couleurs, inviter tes potes avec un
          code, puis défier les équipes de ton secteur. Les résultats et les séries de victoires s&apos;affichent sur le
          profil de l&apos;équipe, et le « roi du terrain » est mis en avant sur chaque city stade.
        </p>
      </>
    ),
  },
  {
    slug: "trouver-des-joueurs-de-foot",
    title: "Trouver des joueurs de foot près de chez soi",
    description:
      "Il te manque des joueurs pour ton match, ou tu cherches à jouer sans équipe ? Les meilleures façons de trouver des joueurs de foot amateur dans ta ville.",
    updated: "2026-10-20",
    body: (
      <>
        <p>
          Il manque toujours deux joueurs. Et quand on vient d&apos;arriver dans une ville, trouver un foot régulier
          n&apos;est pas évident. Quelques pistes.
        </p>
        <h2>Les city stades du quartier</h2>
        <p>
          Passe aux heures de pointe (fin d&apos;après-midi, week-end) : il y a souvent des matchs ouverts où il manque
          quelqu&apos;un. C&apos;est la façon la plus simple de rencontrer des joueurs du coin.
        </p>
        <h2>Le bouche-à-oreille au travail ou à la fac</h2>
        <p>Les collègues et les étudiants sont souvent partants pour un five le soir.</p>
        <h2>Les clubs et associations</h2>
        <p>
          Beaucoup de clubs ont une section loisir ou vétérans, sans compétition. Renseigne-toi auprès du service des
          sports de ta mairie.
        </p>
        <h2>Une appli pensée pour ça</h2>
        <p>
          Sur Supercity, tu vois <App>les matchs ouverts autour de toi</App> et tu t&apos;inscris en un geste. Si tu
          organises, ton match est proposé aux joueurs du secteur, et tes amis sont prévenus quand tu cherches du monde.
          Tu peux aussi parcourir <a href="/foot/">les terrains et matchs ville par ville</a>.
        </p>
      </>
    ),
  },
];

export const bySlug = (slug: string) => articles.find((a) => a.slug === slug);
