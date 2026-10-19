// Boutique : cadres, bannières et titres payés en pièces gagnées en jouant. On clique pour essayer avant d'acheter.
import { BadgeCheck, CheckCircle2, Clock, Lock, LockOpen, PackageOpen } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, Cosmetic, CosmeticType, get, Me, patch, post, Shop as ShopData } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Page } from '../ui/Layout';
import { HelpLink } from '../ui/HelpLink';
import { BannerPattern, bannerBackground, CoinAmount, CosmeticThumb, FramedAvatar, GRADE_LABELS, RARITY, RarityTag, TitleTag } from '../ui/cosmetics';
import { GradeBadge } from '../ui/grade';
import { OrderSheet } from '../ui/OrderSheet';
import { ACCENTS, Button, ErrorText, Kicker, Loading, Success, useToast } from '../ui/ui';

const SECTIONS: { type: CosmeticType; title: string }[] = [
  { type: 'frame', title: 'Cadres photo' },
  { type: 'banner', title: 'Bannières' },
  { type: 'title', title: 'Titres' },
];
const TYPE_LABELS: Record<CosmeticType, string> = { frame: 'Cadre', banner: 'Bannière', title: 'Titre' };

function daysLeft(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return d <= 1 ? 'Dernier jour' : `Plus que ${d} jours`;
}

export default function Shop() {
  const { user, setUser } = useAuth();
  const [shop, setShop] = useState<ShopData | null>(null);
  const [sel, setSel] = useState<Cosmetic | null>(null);
  const [busy, setBusy] = useState(false);
  // Récapitulatif avant d'acheter avec des pièces.
  const [confirmBuy, setConfirmBuy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const { show, toast } = useToast();

  const apply = useCallback(
    (next: ShopData) => {
      setShop(next);
      setSel((cur) => (cur ? next.items.find((i) => i.id === cur.id) ?? null : null));
      get<Me>('/me').then(setUser).catch(() => undefined);
    },
    [setUser]
  );

  useEffect(() => {
    get<ShopData>('/shop')
      .then(setShop)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Boutique indisponible.'));
  }, []);

  if (!user) return null;
  if (!shop)
    return (
      <Page title="Boutique" back="/profile">
        {error ? <ErrorText>{error}</ErrorText> : <Loading />}
      </Page>
    );

  // Essayage : l'objet sélectionné remplace ce qui est porté dans sa case.
  const look = { ...shop.equipped, ...(sel ? { [sel.type]: sel } : {}) };
  const trying = sel && !sel.equipped;
  const bg = bannerBackground(look.banner) ?? ACCENTS[user.accent]?.grad;

  const run = async (fn: () => Promise<ShopData>, done: string, party?: string) => {
    setBusy(true);
    setMsg('');
    setError('');
    try {
      apply(await fn());
      setMsg(done);
      if (party) show(party);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible pour le moment.');
    } finally {
      setBusy(false);
    }
  };

  const action = () => {
    if (!sel) return null;
    if (sel.owned)
      return sel.equipped ? (
        <Button variant="ghost" loading={busy} block onClick={() => run(() => patch('/me/cosmetics', { [sel.type]: null }), 'Retiré de ton profil.')}>
          Retirer
        </Button>
      ) : (
        <Button icon={CheckCircle2} loading={busy} block onClick={() => run(() => patch('/me/cosmetics', { [sel.type]: sel.id }), 'Équipé : tout le monde le voit sur ton profil.')}>
          Équiper
        </Button>
      );
    if (sel.locked)
      return (
        <Button icon={Lock} disabled block>
          {`Grade ${GRADE_LABELS[(sel.min_level ?? 1) - 1]} requis`}
        </Button>
      );
    if (sel.price === 0)
      return (
        <Button icon={LockOpen} loading={busy} block onClick={() => run(() => post(`/shop/${sel.id}/buy`), 'Débloqué ! Équipe-le pour le montrer.', `Débloqué : ${sel.name} ✨`)}>
          Débloquer
        </Button>
      );
    const missing = sel.price - shop.coins;
    return missing > 0 ? (
      <Button disabled block>{`Il te manque ${missing} pièces`}</Button>
    ) : (
      <Button icon={BadgeCheck} loading={busy} block onClick={() => setConfirmBuy(true)}>
        {`Acheter pour ${sel.price} pièces`}
      </Button>
    );
  };

  const seasonal = shop.items.filter((i) => i.collection && i.state === 'on_sale');
  const collections = [...new Set(seasonal.map((i) => i.collection!))];
  const tile = (i: Cosmetic) => {
    const on = sel?.id === i.id;
    return (
      <button
        key={i.id}
        type="button"
        className={`cos-tile${on ? ' is-on' : ''}`}
        style={{ borderColor: on ? RARITY[i.rarity].color : undefined }}
        aria-pressed={on}
        aria-label={`${i.name}, ${RARITY[i.rarity].label}`}
        onClick={() => {
          setMsg('');
          setError('');
          setSel(on ? null : i);
        }}
      >
        <CosmeticThumb item={i} name={user.display_name} uri={user.avatar_url} />
        <b className="ellipsis">{i.name}</b>
        <span className="row" style={{ justifyContent: 'space-between', gap: 4 }}>
          <RarityTag rarity={i.rarity} small />
          {i.equipped ? (
            <CheckCircle2 size={18} color="var(--success)" aria-label="Porté" />
          ) : i.owned ? (
            <span className="cos-tile__owned">À toi</span>
          ) : i.locked ? (
            <Lock size={15} color="var(--dim)" aria-label="Verrouillé" />
          ) : i.price === 0 ? (
            <span className="cos-tile__owned">Offert</span>
          ) : (
            <CoinAmount n={i.price} size={13} />
          )}
        </span>
      </button>
    );
  };

  return (
    <Page
      title="Boutique"
      back="/profile"
      footer={
        sel ? (
          <div className="shop-dock">
            <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
              <div className="grow" style={{ minWidth: 0 }}>
                <b className="ellipsis" style={{ display: 'block', fontSize: 18, fontWeight: 800 }}>
                  {sel.name}
                </b>
                {sel.collection && sel.ends_at ? <span className="sub">{`${sel.collection} · ${daysLeft(sel.ends_at)}`}</span> : null}
              </div>
              <RarityTag rarity={sel.rarity} />
            </div>
            {action()}
          </div>
        ) : undefined
      }
    >
      <section className="hero shop-hero" style={{ background: bg }}>
        <BannerPattern banner={look.banner} />
        <p className="hero__kicker">{trying ? 'Essayage' : 'Ton profil'}</p>
        <div className="row" style={{ gap: 14, position: 'relative' }}>
          <FramedAvatar frame={look.frame} name={user.display_name} uri={user.avatar_url} size={74} tone={user.accent} />
          <div className="stack grow" style={{ gap: 5, minWidth: 0 }}>
            <b className="ellipsis shop-hero__name">{user.display_name}</b>
            <TitleTag title={look.title} />
            <GradeBadge grade={user.grade} />
          </div>
        </div>
      </section>

      <section className="card shop-wallet">
        <div style={{ textAlign: 'center' }}>
          <CoinAmount n={shop.coins} size={26} />
          <span className="kicker" style={{ display: 'block', color: 'var(--dim)', margin: 0 }}>
            pièces
          </span>
        </div>
        <div className="stack grow" style={{ gap: 8 }}>
          <HelpLink q="pieces">Comment gagner des pièces ?</HelpLink>
          <Link to="/inventory" className="row link" style={{ gap: 6, color: 'var(--ink)', fontSize: 13.5 }}>
            <PackageOpen size={16} aria-hidden />
            Mon inventaire · {shop.items.filter((i) => i.owned).length}
          </Link>
        </div>
      </section>
      {sel ? null : <p className="sub">Clique sur un objet pour l'essayer sur ton profil.</p>}
      <ErrorText>{error}</ErrorText>
      <Success>{msg}</Success>

      {collections.map((c) => {
        const items = seasonal.filter((i) => i.collection === c);
        return (
          <section key={c} className="stack" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Kicker>{c}</Kicker>
              {items[0]!.ends_at ? (
                <span className="pill pill--dark">
                  <Clock size={12} aria-hidden />
                  {daysLeft(items[0]!.ends_at)}
                </span>
              ) : null}
            </div>
            <div className="cos-grid">{items.map(tile)}</div>
          </section>
        );
      })}

      {SECTIONS.map(({ type, title }) => {
        const items = shop.items.filter((i) => i.type === type && !(i.collection && i.state === 'on_sale'));
        return items.length ? (
          <section key={type} className="stack" style={{ gap: 10 }}>
            <Kicker>{title}</Kicker>
            <div className="cos-grid">{items.map(tile)}</div>
          </section>
        ) : null;
      })}

      {sel && !sel.owned && sel.price > 0 ? (
        <OrderSheet
          open={confirmBuy}
          title={sel.name}
          icon={BadgeCheck}
          lines={[
            { label: 'Objet', value: `${TYPE_LABELS[sel.type]} · ${RARITY[sel.rarity].label}` },
            { label: 'Tes pièces', value: `${shop.coins}` },
            { label: "Il t'en restera", value: `${shop.coins - sel.price}` },
          ]}
          total={{ label: 'Prix', value: `${sel.price} pièces` }}
          notes={["Aucun argent réel n'est débité. L'objet reste à toi, sans remboursement ni échange."]}
          help="cosmetiques"
          confirm={`Confirmer l'achat · ${sel.price} pièces`}
          busy={busy}
          onClose={() => setConfirmBuy(false)}
          onConfirm={() => {
            setConfirmBuy(false);
            run(() => post(`/shop/${sel.id}/buy`), 'Acheté ! Équipe-le pour le montrer.', `C'est à toi : ${sel.name} ✨`);
          }}
        />
      ) : null}
      {toast}
    </Page>
  );
}
