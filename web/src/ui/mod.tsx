// Modération : boutique (créer et retirer des cosmétiques), événements bonus, scores contestés.
import { CalendarClock, CheckCheck, CircleX, Flame, ShoppingBag, Trash2, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BonusEvent, Cosmetic, CosmeticLook, CosmeticType, del, get, Match, post, Rarity } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dayLabel, timeLabel } from '../lib/format';
import { CoinAmount, CosmeticThumb, RARITY, RarityTag } from './cosmetics';
import { BonusBanner } from './streak';
import { Swatches, TEAM_COLORS } from './swatches';
import { Button, Card, Chips, Empty, Field, Kicker, Label, Loading, TextArea } from './ui';

export type Act = (fn: () => Promise<unknown>, done: string) => Promise<void>;

const TYPES: { value: CosmeticType; label: string }[] = [
  { value: 'frame', label: 'Cadre photo' },
  { value: 'banner', label: 'Bannière' },
  { value: 'title', label: 'Titre' },
];
const RARITIES = (Object.keys(RARITY) as Rarity[]).map((r) => ({ value: r, label: RARITY[r].label }));
const PRICES = [0, 100, 250, 500, 1000, 1500, 2500].map((v) => ({ value: v, label: v ? String(v) : 'Gratuit' }));
const EFFECTS: { value: NonNullable<CosmeticLook['effect']>; label: string }[] = [
  { value: 'none', label: 'Simple' },
  { value: 'glow', label: 'Halo' },
  { value: 'spin', label: 'Tournant' },
];
const PATTERNS: { value: NonNullable<CosmeticLook['pattern']>; label: string }[] = [
  { value: 'none', label: 'Uni' },
  { value: 'stripes', label: 'Rayures' },
  { value: 'dots', label: 'Points' },
  { value: 'flames', label: 'Flammes' },
];
const SEASONS = [
  { value: 0, label: 'Permanent' },
  { value: 14, label: '2 semaines' },
  { value: 30, label: '1 mois' },
  { value: 60, label: '2 mois' },
  { value: 90, label: '3 mois' },
];
const STATE: Record<Cosmetic['state'], string> = { on_sale: 'En vente', upcoming: 'À venir', ended: 'Saison terminée', retired: 'Retiré' };
const swatches = TEAM_COLORS.map((c) => ({ value: c.value, label: c.label, stops: [c.value] }));

export function ModShop({ act }: { act: Act }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Cosmetic[] | null>(null);
  const [type, setType] = useState<CosmeticType>('frame');
  const [name, setName] = useState('');
  const [rarity, setRarity] = useState<Rarity>('rare');
  const [price, setPrice] = useState(500);
  const [c1, setC1] = useState('#1e88e5');
  const [c2, setC2] = useState('#7e57c2');
  const [effect, setEffect] = useState<NonNullable<CosmeticLook['effect']>>('glow');
  const [pattern, setPattern] = useState<NonNullable<CosmeticLook['pattern']>>('stripes');
  const [days, setDays] = useState(30);
  const [collection, setCollection] = useState('');

  const load = useCallback(async () => {
    setItems((await get<{ items: Cosmetic[] }>('/mod/cosmetics').catch(() => ({ items: [] as Cosmetic[] }))).items);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const look: CosmeticLook = { colors: [c1, c2], ...(type === 'frame' ? { effect } : type === 'banner' ? { pattern } : {}) };
  const preview = { id: 0, type, name: name.trim() || 'Aperçu', rarity, look };
  const lastCollection = items?.find((i) => i.collection && i.state !== 'retired')?.collection ?? '';
  const me = user?.display_name ?? 'Toi';

  return (
    <>
      <Kicker>Nouveau cosmétique</Kicker>
      <section className="card stack" style={{ gap: 12 }}>
        <Chips label="Type" options={TYPES} value={type} onChange={(v) => v && setType(v)} />
        <Field label={type === 'title' ? 'Titre affiché' : 'Nom'} value={name} onChange={(e) => setName(e.target.value)} placeholder={type === 'title' ? 'Roi de la lucarne' : 'Givre'} maxLength={40} />
        <Label>Rareté</Label>
        <Chips label="Rareté" options={RARITIES} value={rarity} onChange={(v) => v && setRarity(v)} />
        <Label>Prix en pièces (10 pièces = 1 point de grade)</Label>
        <Chips label="Prix" options={PRICES} value={price} onChange={(v) => v !== null && setPrice(v)} />
        <Label>Couleur 1</Label>
        <Swatches label="Couleur 1" options={swatches} value={c1} onChange={setC1} />
        <Label>Couleur 2</Label>
        <Swatches label="Couleur 2" options={swatches} value={c2} onChange={setC2} />
        {type === 'frame' ? (
          <>
            <Label>Effet</Label>
            <Chips label="Effet" options={EFFECTS} value={effect} onChange={(v) => v && setEffect(v)} />
          </>
        ) : type === 'banner' ? (
          <>
            <Label>Motif</Label>
            <Chips label="Motif" options={PATTERNS} value={pattern} onChange={(v) => v && setPattern(v)} />
          </>
        ) : null}
        <Label>Disponibilité</Label>
        <Chips label="Disponibilité" options={SEASONS} value={days} onChange={(v) => v !== null && setDays(v)} />
        {days ? <Field label="Collection de saison" value={collection} onChange={(e) => setCollection(e.target.value)} placeholder={lastCollection || "Saison d'hiver"} maxLength={40} /> : null}
        <div style={{ background: 'var(--tint)', borderRadius: 16, padding: 10 }}>
          <CosmeticThumb item={preview} name={me} uri={user?.avatar_url} />
        </div>
        <Button
          icon={ShoppingBag}
          disabled={name.trim().length < 2 || (days > 0 && (collection.trim() || lastCollection).length < 2)}
          onClick={() =>
            act(async () => {
              const now = new Date();
              await post('/mod/cosmetics', {
                type,
                name: name.trim(),
                rarity,
                price,
                look,
                ...(days ? { collection: collection.trim() || lastCollection, starts_at: now.toISOString(), ends_at: new Date(now.getTime() + days * 86400000).toISOString() } : {}),
              });
              setName('');
              await load();
            }, 'En boutique : les joueurs le voient tout de suite.')
          }
        >
          Mettre en boutique
        </Button>
      </section>

      <Kicker>Catalogue</Kicker>
      {items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty icon={ShoppingBag} title="Boutique vide" text="Crée le premier cosmétique." />
      ) : (
        items.map((i) => (
          <div key={i.id} className="card mod-item" style={{ opacity: i.state === 'on_sale' ? 1 : 0.6 }}>
            <div style={{ width: 92, flexShrink: 0 }}>
              <CosmeticThumb item={i} name={me} uri={user?.avatar_url} />
            </div>
            <div className="stack grow" style={{ gap: 4 }}>
              <b>{i.name}</b>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <RarityTag rarity={i.rarity} small />
                {i.price ? <CoinAmount n={i.price} size={12} /> : <span className="sub">Gratuit</span>}
              </div>
              <span className="sub" style={{ fontSize: 13 }}>
                {[STATE[i.state], i.collection, i.min_level ? 'réservé à un grade' : null, `${i.owners ?? 0} joueur${(i.owners ?? 0) > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
              </span>
              {i.state === 'on_sale' || i.state === 'upcoming' ? (
                <div>
                  <Button
                    variant="ghost"
                    small
                    icon={CircleX}
                    onClick={() =>
                      act(async () => {
                        await del(`/mod/cosmetics/${i.id}`);
                        await load();
                      }, "Retiré : ceux qui l'ont déjà le gardent.")
                    }
                  >
                    Retirer de la vente
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ))
      )}
    </>
  );
}

const MULTIPLIERS = [1, 2, 3, 5].map((v) => ({ value: v, label: v === 1 ? 'Aucun' : `x${v}` }));
const BONUSES = [0, 1, 2, 3, 5, 10].map((v) => ({ value: v, label: v ? `+${v}` : 'Aucun' }));
const EVENT_DAYS = [
  { value: 1, label: '1 jour' },
  { value: 2, label: '2 jours' },
  { value: 7, label: '1 semaine' },
  { value: 14, label: '2 semaines' },
  { value: 31, label: '1 mois' },
];

/** Débuts proposés : maintenant, demain matin, ou samedi prochain (le week-end). */
function starts(): { value: string; label: string; date: Date }[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const saturday = new Date(tomorrow);
  saturday.setDate(tomorrow.getDate() + ((6 - tomorrow.getDay() + 7) % 7));
  return [
    { value: 'now', label: 'Maintenant', date: now },
    { value: 'tomorrow', label: 'Demain', date: tomorrow },
    { value: 'saturday', label: `Samedi ${saturday.getDate()}`, date: saturday },
  ];
}

export function ModEvents({ act }: { act: Act }) {
  const [items, setItems] = useState<BonusEvent[] | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [multiplier, setMultiplier] = useState(2);
  const [bonus, setBonus] = useState(0);
  const [start, setStart] = useState('saturday');
  const [days, setDays] = useState(2);

  const load = useCallback(async () => {
    setItems((await get<{ items: BonusEvent[] }>('/bonus-events').catch(() => ({ items: [] as BonusEvent[] }))).items);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const from = starts().find((x) => x.value === start)!.date;
  const to = new Date(from.getTime() + days * 86400 * 1000);
  const preview: BonusEvent = {
    id: 0,
    title: title.trim() || 'Ton événement',
    description: description.trim() || null,
    multiplier,
    bonus_points: bonus,
    venue: null,
    starts_at: from.toISOString(),
    ends_at: to.toISOString(),
    active: start === 'now',
  };

  return (
    <>
      <Kicker>Créer un événement</Kicker>
      <section className="card stack" style={{ gap: 12 }}>
        <Field label="Nom" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week-end en feu" maxLength={60} />
        <TextArea label="Message (facultatif)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tous les matchs du week-end comptent double !" maxLength={300} rows={2} />
        <Label>Points multipliés</Label>
        <Chips label="Points multipliés" options={MULTIPLIERS} value={multiplier} onChange={(v) => v && setMultiplier(v)} />
        <Label>Points en plus par match joué</Label>
        <Chips label="Points en plus" options={BONUSES} value={bonus} onChange={(v) => v !== null && setBonus(v)} />
        <Label>Début</Label>
        <Chips label="Début" options={starts()} value={start} onChange={(v) => v && setStart(v)} />
        <Label>Durée</Label>
        <Chips label="Durée" options={EVENT_DAYS} value={days} onChange={(v) => v && setDays(v)} />
        <p className="sub">
          <CalendarClock size={14} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />
          Du {dayLabel(from).toLowerCase()} {timeLabel(from)} au {dayLabel(to).toLowerCase()} {timeLabel(to)}. Compte pour les matchs qui commencent pendant l'événement, sur tous les terrains.
        </p>
        <BonusBanner event={preview} compact />
        <Button
          icon={Flame}
          disabled={title.trim().length < 3 || (multiplier === 1 && bonus === 0)}
          onClick={() =>
            act(async () => {
              await post('/mod/bonus-events', {
                title: title.trim(),
                description: description.trim() || undefined,
                multiplier,
                bonus_points: bonus,
                starts_at: from.toISOString(),
                ends_at: to.toISOString(),
              });
              setTitle('');
              setDescription('');
              await load();
            }, "Événement lancé : tout le monde le voit sur l'accueil.")
          }
        >
          Lancer l'événement
        </Button>
      </section>

      <Kicker>En cours et à venir</Kicker>
      {items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty icon={Zap} title="Aucun événement" text="Lance-en un pour faire bouger les terrains." />
      ) : (
        items.map((e) => (
          <div key={e.id} className="stack" style={{ gap: 6 }}>
            <BonusBanner event={e} />
            <div>
              <Button
                variant="ghost"
                small
                icon={Trash2}
                onClick={() =>
                  act(async () => {
                    await del(`/mod/bonus-events/${e.id}`);
                    await load();
                  }, 'Événement supprimé, les points sont recalculés.')
                }
              >
                Supprimer
              </Button>
            </div>
          </div>
        ))
      )}
    </>
  );
}

export function ModDisputes() {
  const [items, setItems] = useState<Match[] | null>(null);
  useEffect(() => {
    get<{ items: Match[] }>('/mod/disputes')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);
  if (items === null) return <Loading />;
  if (!items.length) return <Empty icon={CheckCheck} title="Aucun score contesté" text="Les capitaines sont d'accord partout." />;
  return (
    <>
      <p className="sub">Les deux capitaines ont annoncé des scores différents. Ouvre le match pour valider le bon.</p>
      {items.map((m) => (
        <Card key={m.id} to={`/match/${m.id}`} className="stack" style={{ gap: 4 }}>
          <b>
            {m.home_team?.name} contre {m.away_team?.name}
          </b>
          <span className="sub">
            {dayLabel(new Date(m.starts_at))} · {m.venue.name} · dernier score annoncé : {m.score?.home} - {m.score?.away}
          </span>
        </Card>
      ))}
    </>
  );
}
