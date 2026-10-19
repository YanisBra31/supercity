// Inventaire : tout ce que le joueur possède, rangé par type. Un clic équipe l'objet, un autre le retire.
import { CheckCircle2, ChevronRight, ShoppingBag, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, Cosmetic, CosmeticType, get, Me, patch, Shop } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Page } from '../ui/Layout';
import { BannerPattern, bannerBackground, CoinAmount, CosmeticThumb, FramedAvatar, RARITY, RarityTag, TitleTag } from '../ui/cosmetics';
import { GradeBadge } from '../ui/grade';
import { ACCENTS, ButtonLink, Empty, ErrorText, Kicker, Loading } from '../ui/ui';

const SECTIONS: { type: CosmeticType; title: string }[] = [
  { type: 'frame', title: 'Cadres photo' },
  { type: 'banner', title: 'Bannières' },
  { type: 'title', title: 'Titres' },
];

export default function Inventory() {
  const { user, setUser } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    get<Shop>('/shop')
      .then(setShop)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Inventaire indisponible.'));
  }, []);

  if (!user) return null;
  if (!shop)
    return (
      <Page title="Inventaire" back="/profile">
        {error ? <ErrorText>{error}</ErrorText> : <Loading />}
      </Page>
    );

  const owned = shop.items.filter((i) => i.owned);
  const toggle = async (i: Cosmetic) => {
    setBusy(i.id);
    setError('');
    try {
      setShop(await patch<Shop>('/me/cosmetics', { [i.type]: i.equipped ? null : i.id }));
      get<Me>('/me').then(setUser).catch(() => undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible pour le moment.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Page title="Inventaire" back="/profile">
      <section className="hero shop-hero" style={{ background: bannerBackground(shop.equipped.banner) ?? ACCENTS[user.accent]?.grad }}>
        <BannerPattern banner={shop.equipped.banner} />
        <p className="hero__kicker">Ce que les autres voient</p>
        <div className="row" style={{ gap: 14, position: 'relative' }}>
          <FramedAvatar frame={shop.equipped.frame} name={user.display_name} uri={user.avatar_url} size={74} tone={user.accent} />
          <div className="stack grow" style={{ gap: 5, minWidth: 0 }}>
            <b className="ellipsis shop-hero__name">{user.display_name}</b>
            <TitleTag title={shop.equipped.title} />
            <GradeBadge grade={user.grade} />
          </div>
        </div>
      </section>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <b>
          {owned.length} objet{owned.length > 1 ? 's' : ''}
        </b>
        <Link to="/shop" className="row link" style={{ gap: 8 }}>
          <CoinAmount n={shop.coins} size={16} />
          Boutique
          <ChevronRight size={16} aria-hidden />
        </Link>
      </div>
      <ErrorText>{error}</ErrorText>

      {!owned.length ? (
        <Empty
          icon={Sparkles}
          title="Ton inventaire est vide"
          text="Gagne des pièces en jouant et offre-toi un cadre, une bannière ou un titre."
          action={
            <ButtonLink to="/shop" icon={ShoppingBag}>
              Aller à la boutique
            </ButtonLink>
          }
        />
      ) : (
        <p className="sub">Clique sur un objet pour le porter, encore une fois pour le retirer.</p>
      )}

      {SECTIONS.map(({ type, title }) => {
        const items = owned.filter((i) => i.type === type);
        return items.length ? (
          <section key={type} className="stack" style={{ gap: 10 }}>
            <Kicker>{title}</Kicker>
            <div className="cos-grid">
              {items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className={`cos-tile${i.equipped ? ' is-on' : ''}`}
                  style={{ borderColor: i.equipped ? RARITY[i.rarity].color : undefined, opacity: busy === i.id ? 0.7 : 1 }}
                  onClick={() => toggle(i)}
                  disabled={busy !== null}
                  aria-pressed={i.equipped}
                  aria-label={`${i.name}, ${i.equipped ? 'porté, cliquer pour retirer' : 'cliquer pour porter'}`}
                >
                  <CosmeticThumb item={i} name={user.display_name} uri={user.avatar_url} />
                  <b className="ellipsis">{i.name}</b>
                  <span className="row" style={{ justifyContent: 'space-between', gap: 4 }}>
                    <RarityTag rarity={i.rarity} small />
                    {i.equipped ? (
                      <span className="row cos-tile__owned" style={{ gap: 3 }}>
                        <CheckCircle2 size={16} aria-hidden />
                        Porté
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null;
      })}
      {owned.length ? (
        <ButtonLink to="/shop" variant="ghost" icon={ShoppingBag}>
          Voir la boutique
        </ButtonLink>
      ) : null}
    </Page>
  );
}
