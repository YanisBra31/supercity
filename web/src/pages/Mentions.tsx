// Mentions légales : éditeur, hébergeur, prestataires. Mêmes informations que le site (app/legal.ts) et l'appli mobile : les changer partout.
import { ReactNode } from 'react';
import { Link } from 'react-router';
import { Page } from '../ui/Layout';

const LEGAL = {
  editeur: 'Yanis Yahia',
  statut: 'particulier',
  adresse: '31400 Toulouse, France',
  email: 'contact@supercity.fr',
  directeur: 'Yanis Yahia',
  majLe: '13 octobre 2026',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

export default function Mentions() {
  return (
    <Page title="Mentions légales">
      <div className="prose">
        <p className="kicker">Mise à jour le {LEGAL.majLe}</p>
        <p className="sub">Qui édite Supercity, où l'appli est hébergée et avec qui elle travaille.</p>
        <Section title="Éditeur">
          L'appli Supercity et le site supercity.fr sont édités par {LEGAL.editeur}, {LEGAL.statut}, {LEGAL.adresse}.
          <br />
          Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
          <br />
          Directeur de la publication : {LEGAL.directeur}.
        </Section>
        <Section title="Hébergeur">
          Hostinger International Ltd, 61 Lordou Vironos Street, 6023 Larnaca, Chypre,{' '}
          <a href="https://www.hostinger.fr" target="_blank" rel="noreferrer">
            hostinger.fr
          </a>
          . Les comptes, matchs, équipes et publications y sont stockés.
        </Section>
        <Section title="Paiements">
          Les places payantes sont réglées sur Stripe Payments Europe Ltd (Dublin, Irlande). Supercity ne voit ni ne conserve tes coordonnées bancaires. Le paiement est versé directement à la structure qui organise.
        </Section>
        <Section title="Notifications">
          Les notifications passent par Expo (650 Industries, États-Unis), puis par Google Firebase sur Android ou Apple sur iPhone. Seuls un identifiant de téléphone et le texte de l'alerte leur sont transmis.
        </Section>
        <Section title="Propriété intellectuelle">
          Le nom Supercity, l'écusson, les textes, les visuels et l'interface de l'appli appartiennent à leur éditeur. Toute reproduction sans autorisation écrite est interdite. Les photos et publications restent la propriété de leurs auteurs, qui autorisent leur affichage dans l'appli.
        </Section>
        <Section title="Tes données">
          Ce qu'on garde et tes droits sont expliqués dans les <Link to="/cgu">conditions d'utilisation</Link> et la <a href="/confidentialite/">politique de confidentialité</a>. Pour toute demande, écris à {LEGAL.email}.
        </Section>
      </div>
    </Page>
  );
}
