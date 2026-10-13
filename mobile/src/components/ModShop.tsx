// Modération : créer les cosmétiques de la boutique (permanents ou de saison) et les retirer de la vente.
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Cosmetic, CosmeticLook, CosmeticType, del, get, post, Rarity } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Swatches, TEAM_COLORS } from './AccentPicker';
import { CoinAmount, CosmeticThumb, RARITY, RarityTag } from './Cosmetics';
import { Button, Card, Chips, colors, Empty, Field, font, Kicker, Label, Loading, s } from './ui';

type Act = (fn: () => Promise<unknown>, done: string) => Promise<void>;

const TYPES: { value: CosmeticType; label: string }[] = [
  { value: 'frame', label: 'Cadre photo' },
  { value: 'banner', label: 'Bannière' },
  { value: 'title', label: 'Titre' },
];
const RARITIES = (Object.keys(RARITY) as Rarity[]).map((r) => ({ value: r, label: RARITY[r].label }));
const PRICES = [0, 100, 250, 500, 1000, 1500, 2500].map((v) => ({ value: v, label: v ? String(v) : 'Gratuit' }));
const EFFECTS = [
  { value: 'none', label: 'Simple' },
  { value: 'glow', label: 'Halo' },
  { value: 'spin', label: 'Tournant' },
] as const;
const PATTERNS = [
  { value: 'none', label: 'Uni' },
  { value: 'stripes', label: 'Rayures' },
  { value: 'dots', label: 'Points' },
  { value: 'flames', label: 'Flammes' },
] as const;
const SEASONS = [
  { value: 0, label: 'Permanent' },
  { value: 14, label: '2 semaines' },
  { value: 30, label: '1 mois' },
  { value: 60, label: '2 mois' },
  { value: 90, label: '3 mois' },
];
const STATE: Record<Cosmetic['state'], string> = { on_sale: 'En vente', upcoming: 'À venir', ended: 'Saison terminée', retired: 'Retiré' };
const swatches = TEAM_COLORS.map((c) => ({ value: c.value, label: c.label, stops: [c.value, c.value] as const }));

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
    setItems((await get<{ items: Cosmetic[] }>('/mod/cosmetics').catch(() => ({ items: [] }))).items);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const look: CosmeticLook = { colors: [c1, c2], ...(type === 'frame' ? { effect } : type === 'banner' ? { pattern } : {}) };
  const preview = { id: 0, type, name: name.trim() || 'Aperçu', rarity, look };
  const lastCollection = items?.find((i) => i.collection && i.state !== 'retired')?.collection ?? '';

  return (
    <>
      <Kicker>Nouveau cosmétique</Kicker>
      <Card style={{ gap: 12 }}>
        <Chips options={TYPES} value={type} onChange={(v) => v && setType(v)} />
        <Field label={type === 'title' ? 'Titre affiché' : 'Nom'} value={name} onChangeText={setName} placeholder={type === 'title' ? 'Roi de la lucarne' : 'Givre'} maxLength={40} />
        <Label>Rareté</Label>
        <Chips options={RARITIES} value={rarity} onChange={(v) => v && setRarity(v)} />
        <Label>Prix en pièces (10 pièces = 1 point de grade)</Label>
        <Chips options={PRICES} value={price} onChange={(v) => v !== null && setPrice(v)} />
        <Label>Couleur 1</Label>
        <Swatches options={swatches} value={c1} onChange={setC1} />
        <Label>Couleur 2</Label>
        <Swatches options={swatches} value={c2} onChange={setC2} />
        {type === 'frame' ? (
          <>
            <Label>Effet</Label>
            <Chips options={[...EFFECTS]} value={effect} onChange={(v) => v && setEffect(v)} />
          </>
        ) : type === 'banner' ? (
          <>
            <Label>Motif</Label>
            <Chips options={[...PATTERNS]} value={pattern} onChange={(v) => v && setPattern(v)} />
          </>
        ) : null}
        <Label>Disponibilité</Label>
        <Chips options={SEASONS} value={days} onChange={(v) => v !== null && setDays(v)} />
        {days ? (
          <Field
            label="Collection de saison"
            value={collection}
            onChangeText={setCollection}
            placeholder={lastCollection || "Saison d'hiver"}
            maxLength={40}
          />
        ) : null}
        <View style={{ backgroundColor: colors.tint, borderRadius: 16, padding: 10 }}>
          <CosmeticThumb item={preview} name={user?.display_name ?? 'Toi'} uri={user?.avatar_url} />
        </View>
        <Button
          title="Mettre en boutique"
          icon="bag-add"
          disabled={name.trim().length < 2 || (days > 0 && (collection.trim() || lastCollection).length < 2)}
          onPress={() =>
            act(async () => {
              const now = new Date();
              await post('/mod/cosmetics', {
                type,
                name: name.trim(),
                rarity,
                price,
                look,
                ...(days
                  ? { collection: collection.trim() || lastCollection, starts_at: now.toISOString(), ends_at: new Date(now.getTime() + days * 86400000).toISOString() }
                  : {}),
              });
              setName('');
              await load();
            }, 'En boutique : les joueurs le voient tout de suite.')
          }
        />
      </Card>

      <Kicker>Catalogue</Kicker>
      {items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty icon="bag-outline" title="Boutique vide" text="Crée le premier cosmétique." />
      ) : (
        items.map((i) => (
          <Card key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: i.state === 'on_sale' ? 1 : 0.6 }}>
            <View style={{ width: 92 }}>
              <CosmeticThumb item={i} name={user?.display_name ?? 'Toi'} uri={user?.avatar_url} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...font.bold, fontSize: 14, color: colors.ink }}>{i.name}</Text>
              <View style={[s.row, { gap: 6, flexWrap: 'wrap' }]}>
                <RarityTag rarity={i.rarity} small />
                {i.price ? <CoinAmount n={i.price} size={12} /> : <Text style={s.sub}>Gratuit</Text>}
              </View>
              <Text style={s.sub}>
                {[STATE[i.state], i.collection, i.min_level ? 'réservé à un grade' : null, `${i.owners ?? 0} joueur${(i.owners ?? 0) > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
              </Text>
              {i.state === 'on_sale' || i.state === 'upcoming' ? (
                <Button
                  title="Retirer de la vente"
                  variant="ghost"
                  icon="close-circle-outline"
                  onPress={() =>
                    act(async () => {
                      await del(`/mod/cosmetics/${i.id}`);
                      await load();
                    }, 'Retiré : ceux qui l\'ont déjà le gardent.')
                  }
                />
              ) : null}
            </View>
          </Card>
        ))
      )}
    </>
  );
}
