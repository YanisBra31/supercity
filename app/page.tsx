// supercity.fr montre la présentation du projet (la même que /decouvrir/) : un visiteur ou un robot y trouve du contenu,
// pas une redirection vers l'écran de connexion. Un joueur déjà connecté repart tout de suite dans l'appli.
import type { Metadata } from "next";
import Home from "./decouvrir/page";

export const metadata: Metadata = {
  title: { absolute: "Supercity · Trouve un match de foot près de chez toi (city, futsal, 5, 8 ou 11)" },
  description:
    "Supercity, l'appli gratuite du foot amateur : trouve un match de city ou de futsal près de chez toi, organise le tien, monte ton équipe et défie celles du quartier.",
  alternates: { canonical: "/decouvrir/" },
};

const toApp = "try{if(localStorage.getItem('supercity_token'))location.replace('/app/'+location.search+location.hash)}catch(e){}";

export default function Root() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: toApp }} />
      <Home />
    </>
  );
}
