// Espace pro : un five, un club, une association ou un coach publie des matchs et des tournois payants.
import { Banknote, Briefcase, CheckCircle2, CreditCard, ExternalLink, Eye, Megaphone, Pencil, RefreshCw, Smartphone, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, get, MyOrganization, patch, post } from '../lib/api';
import { orgKindLabel } from '../lib/format';
import { euros, openStripe, returnUrl } from '../lib/pay';
import { Page } from '../ui/Layout';
import { OrgForm, OrgInput } from '../ui/OrgForm';
import { Hero } from '../ui/hero';
import { Button, ButtonLink, ErrorText, Icon, Kicker, Loading } from '../ui/ui';

function Step({ icon: I, text }: { icon: Icon; text: string }) {
  return (
    <p className="row" style={{ gap: 10, alignItems: 'flex-start', margin: 0 }}>
      <I size={18} aria-hidden style={{ color: 'var(--orange-2)', flexShrink: 0, marginTop: 2 }} />
      <span>{text}</span>
    </p>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card pro-stat">
      <b>{value}</b>
      <span className="sub">{label}</span>
    </div>
  );
}

export default function Pro() {
  const [org, setOrg] = useState<MyOrganization | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setOrg((await get<{ organization: MyOrganization | null }>('/me/organization')).organization);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible.');
    }
  }, []);
  // Rechargé aussi au retour de Stripe (l'onglet redevient visible ou la page est rouverte).
  useEffect(() => {
    load();
    const onShow = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, [load]);

  const save = async (v: OrgInput) => {
    const res = org ? await patch<{ organization: MyOrganization }>('/me/organization', v) : await post<{ organization: MyOrganization }>('/me/organization', v);
    setOrg(res.organization);
    setEditing(false);
  };

  // Stripe s'ouvre à la place de la page, puis revient sur /pro.
  const open = async (path: string) => {
    setBusy(true);
    setError('');
    try {
      const { url } = await post<{ url: string }>(path, { return_url: returnUrl('pro') });
      await openStripe(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ouverture impossible.');
      setBusy(false);
    }
  };

  if (org === undefined)
    return (
      <Page title="Espace pro" back="/settings">
        {error ? <ErrorText>{error}</ErrorText> : <Loading />}
      </Page>
    );

  if (!org)
    return (
      <Page title="Espace pro" back="/settings">
        <Hero kicker="Espace pro" title="Remplis tes terrains" sub="Pour les fives, clubs, associations et coachs : publie des créneaux et des tournois payants, les joueurs réservent et paient dans l'appli." />
        <section className="card stack" style={{ gap: 12 }}>
          <Step icon={Briefcase} text="Crée l'espace de ta structure, puis active les paiements : Stripe vérifie ta structure (SIRET ou RNA) et ton RIB, une seule fois." />
          <Step icon={Trophy} text="Publie des matchs ou des tournois jusqu'à 200 joueurs, au prix que tu choisis." />
          <Step icon={Smartphone} text="Les joueurs paient par carte, Apple Pay ou Google Pay, sans rien avoir à créer." />
          <Step icon={Banknote} text="Tu reçois le prix des places par virement, moins la commission Supercity." />
        </section>
        <Kicker>Ta structure</Kicker>
        <OrgForm submitLabel="Créer mon espace pro" onSubmit={save} />
      </Page>
    );

  const p = org.payouts;
  return (
    <Page title="Espace pro" back="/settings">
      <Hero kicker={`Espace pro · ${orgKindLabel(org.kind)}`} title={org.name} sub={org.city ?? undefined} />
      <div className="pro-stats">
        <Stat value={String(org.stats.places_sold)} label="places vendues" />
        <Stat value={euros(org.stats.net_cents)} label="pour toi" />
        <Stat value={String(org.stats.upcoming)} label="à venir" />
      </div>

      <section className="card stack" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          {p.ready ? <CheckCircle2 size={26} color="var(--success)" aria-hidden /> : <CreditCard size={26} color="var(--orange-2)" aria-hidden />}
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{p.ready ? 'Tu peux encaisser' : p.connected ? 'Vérification en cours chez Stripe' : 'Active les paiements'}</h2>
        </div>
        <Step icon={Smartphone} text={`Chaque joueur paie le prix de la place, plus ${euros(p.fee_cents)} de frais de service.`} />
        <Step icon={Banknote} text={`Tu reçois le prix moins ${String(p.commission_percent).replace('.', ',')} % de commission Supercity, par virement Stripe.`} />
        <Step icon={RefreshCw} text={`Un joueur qui se désiste plus de ${p.refund_hours} h avant est remboursé. Si tu annules, tout le monde est remboursé.`} />
        {!p.enabled ? (
          <p className="sub">Le paiement en ligne n'est pas encore activé sur Supercity.</p>
        ) : p.ready ? (
          <Button icon={ExternalLink} variant="dark" loading={busy} onClick={() => open('/me/organization/dashboard')}>
            Voir mes virements
          </Button>
        ) : (
          <>
            <Button icon={CreditCard} loading={busy} onClick={() => open('/me/organization/onboard')}>
              {p.connected ? 'Terminer mon inscription Stripe' : 'Activer les paiements'}
            </Button>
            <p className="sub">Stripe te demande les infos de ta structure et son RIB, une seule fois.</p>
          </>
        )}
        <ErrorText>{error}</ErrorText>
      </section>

      <ButtonLink to="/create" icon={Megaphone}>
        Publier un match ou un tournoi
      </ButtonLink>
      <ButtonLink to={`/org/${org.id}`} variant="ghost" icon={Eye}>
        Voir ma page publique
      </ButtonLink>

      <Kicker>Ta structure</Kicker>
      {editing ? (
        <OrgForm org={org} submitLabel="Enregistrer" onSubmit={save} />
      ) : (
        <Button variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>
          Modifier les infos
        </Button>
      )}
    </Page>
  );
}
