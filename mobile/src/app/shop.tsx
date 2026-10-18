// Boutique : cadres, bannières et titres payés en pièces gagnées en jouant. On essaie avant d'acheter.
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gradient, Hero } from "../components/brand";
import {
  BannerPattern,
  bannerColors,
  CoinAmount,
  CosmeticThumb,
  FramedAvatar,
  GRADE_LABELS,
  RarityTag,
  RARITY,
  TitleTag,
} from "../components/Cosmetics";
import { GradeBadge } from "../components/Grade";
import {
  Button,
  colors,
  ErrorText,
  font,
  Kicker,
  Loading,
  s,
  Screen,
  Success,
} from "../components/ui";
import {
  ApiError,
  Cosmetic,
  CosmeticType,
  get,
  Me,
  patch,
  post,
  Shop as ShopData,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import { celebrate } from "../components/Celebration";
import { OrderSheet } from "../components/OrderSheet";

const SECTIONS: { type: CosmeticType; title: string }[] = [
  { type: "frame", title: "Cadres photo" },
  { type: "banner", title: "Bannières" },
  { type: "title", title: "Titres" },
];

function daysLeft(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return d <= 1 ? "Dernier jour" : `Plus que ${d} jours`;
}

const TYPE_LABELS: Record<CosmeticType, string> = { frame: "Cadre", banner: "Bannière", title: "Titre" };

export default function Shop() {
  const { user, setUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [shop, setShop] = useState<ShopData | null>(null);
  const [sel, setSel] = useState<Cosmetic | null>(null);
  const [busy, setBusy] = useState(false);
  // Récapitulatif avant d'acheter avec des pièces.
  const [confirmBuy, setConfirmBuy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const apply = useCallback(
    (next: ShopData) => {
      setShop(next);
      setSel((cur) =>
        cur ? (next.items.find((i) => i.id === cur.id) ?? null) : null,
      );
      get<Me>("/me")
        .then(setUser)
        .catch(() => undefined);
    },
    [setUser],
  );

  useEffect(() => {
    get<ShopData>("/shop")
      .then(setShop)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Boutique indisponible."),
      );
  }, []);

  if (!user) return null;
  if (!shop)
    return error ? (
      <Screen>
        <ErrorText>{error}</ErrorText>
      </Screen>
    ) : (
      <Loading />
    );

  // Essayage : l'objet sélectionné remplace ce qui est porté dans sa case.
  const look = { ...shop.equipped, ...(sel ? { [sel.type]: sel } : {}) };
  const trying = sel && !sel.equipped;

  // Achat réussi : un peu de fête.
  const bought = async (req: Promise<ShopData>) => {
    const r = await req;
    if (sel) celebrate({ title: sel.price ? "C'est à toi !" : 'Débloqué !', text: sel.name, icon: 'sparkles' });
    return r;
  };

  const run = async (fn: () => Promise<ShopData>, done: string) => {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      apply(await fn());
      setMsg(done);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Action impossible pour le moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  const action = () => {
    if (!sel) return null;
    if (sel.owned) {
      return sel.equipped ? (
        <Button
          title="Retirer"
          variant="ghost"
          loading={busy}
          onPress={() =>
            run(
              () => patch("/me/cosmetics", { [sel.type]: null }),
              "Retiré de ton profil.",
            )
          }
        />
      ) : (
        <Button
          title="Équiper"
          icon="checkmark-circle"
          loading={busy}
          onPress={() =>
            run(
              () => patch("/me/cosmetics", { [sel.type]: sel.id }),
              "Équipé : tout le monde le voit sur ton profil.",
            )
          }
        />
      );
    }
    if (sel.locked)
      return (
        <Button
          title={`Grade ${GRADE_LABELS[(sel.min_level ?? 1) - 1]} requis`}
          icon="lock-closed"
          disabled
          onPress={() => undefined}
        />
      );
    if (sel.price === 0)
      return (
        <Button
          title="Débloquer"
          icon="lock-open"
          loading={busy}
          onPress={() =>
            run(
              () => bought(post(`/shop/${sel.id}/buy`)),
              "Débloqué ! Équipe-le pour le montrer.",
            )
          }
        />
      );
    const missing = sel.price - shop.coins;
    return missing > 0 ? (
      <Button
        title={`Il te manque ${missing} pièces`}
        disabled
        onPress={() => undefined}
      />
    ) : (
      <Button
        title={`Acheter pour ${sel.price} pièces`}
        icon="bag-check"
        loading={busy}
        onPress={() => setConfirmBuy(true)}
      />
    );
  };

  const seasonal = shop.items.filter(
    (i) => i.collection && i.state === "on_sale",
  );
  const collections = [...new Set(seasonal.map((i) => i.collection!))];
  const tile = (i: Cosmetic) => {
    const on = sel?.id === i.id;
    return (
      <Pressable
        key={i.id}
        accessibilityRole="button"
        accessibilityLabel={`${i.name}, ${RARITY[i.rarity].label}`}
        onPress={() => {
          setMsg("");
          setError("");
          setSel(on ? null : i);
        }}
        style={({ pressed }) => [
          st.tile,
          { borderColor: on ? RARITY[i.rarity].color : colors.line },
          on && st.tileOn,
          pressed && { transform: [{ scale: 0.97 }] },
        ]}
      >
        <CosmeticThumb
          item={i}
          name={user.display_name}
          uri={user.avatar_url}
        />
        <Text style={st.tileName} numberOfLines={1}>
          {i.name}
        </Text>
        <View style={[s.row, { justifyContent: "space-between", gap: 4 }]}>
          <RarityTag rarity={i.rarity} small />
          {i.equipped ? (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colors.success}
            />
          ) : i.owned ? (
            <Text style={st.owned}>À toi</Text>
          ) : i.locked ? (
            <Ionicons name="lock-closed" size={15} color={colors.dim} />
          ) : i.price === 0 ? (
            <Text style={st.owned}>Offert</Text>
          ) : (
            <CoinAmount n={i.price} size={13} />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        <Hero
          title=""
          colors={bannerColors(look.banner)}
          tone={user.accent}
          kicker={trying ? "Essayage" : "Ton profil"}
          kickerColor={colors.chalk}
        >
          <BannerPattern banner={look.banner} />
          <View style={[s.row, { gap: 14 }]}>
            <FramedAvatar
              frame={look.frame}
              name={user.display_name}
              uri={user.avatar_url}
              size={74}
            />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={st.name} numberOfLines={1}>
                {user.display_name}
              </Text>
              <TitleTag title={look.title} />
              <GradeBadge grade={user.grade} />
            </View>
          </View>
        </Hero>

        <View style={st.wallet}>
          <View style={{ alignItems: "center" }}>
            <CoinAmount n={shop.coins} size={26} />
            <Text style={st.walletUnit}>pièces</Text>
          </View>
          <Text style={[s.sub, { flex: 1 }]}>
            Tu en gagnes {shop.coins_per_point} par point de grade : joue,
            gagne, organise.
          </Text>
        </View>
        {sel ? null : (
          <Text style={s.sub}>
            Touche un objet pour l'essayer sur ton profil.
          </Text>
        )}
        <ErrorText>{error}</ErrorText>
        <Success>{msg}</Success>

        {collections.map((c) => {
          const items = seasonal.filter((i) => i.collection === c);
          return (
            <View key={c} style={{ gap: 10 }}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Kicker>{c}</Kicker>
                {items[0].ends_at ? (
                  <View style={st.timer}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={colors.chalk}
                    />
                    <Text style={st.timerText}>
                      {daysLeft(items[0].ends_at)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={st.grid}>{items.map(tile)}</View>
            </View>
          );
        })}

        {SECTIONS.map(({ type, title }) => {
          const items = shop.items.filter(
            (i) => i.type === type && !(i.collection && i.state === "on_sale"),
          );
          return items.length ? (
            <View key={type} style={{ gap: 10 }}>
              <Kicker>{title}</Kicker>
              <View style={st.grid}>{items.map(tile)}</View>
            </View>
          ) : null;
        })}
        <Text style={[s.sub, { textAlign: "center" }]}>
          Les cosmétiques ne changent ni ton grade ni tes points.
        </Text>
        {sel ? <View style={{ height: 190 }} /> : null}
      </Screen>

      {sel ? (
        <View style={[st.dock, { paddingBottom: insets.bottom + 14 }]}>
          <Gradient
            colors={bannerColors(look.banner)}
            tone={user.accent}
            style={st.mini}
          >
            <BannerPattern banner={look.banner} />
            <FramedAvatar
              frame={look.frame}
              name={user.display_name}
              uri={user.avatar_url}
              size={46}
            />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={st.miniName} numberOfLines={1}>
                {user.display_name}
              </Text>
              <TitleTag title={look.title} size="sm" />
            </View>
          </Gradient>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View style={{ flex: 1 }}>
              <Text style={st.panelTitle} numberOfLines={1}>
                {sel.name}
              </Text>
              {sel.collection && sel.ends_at ? (
                <Text
                  style={s.sub}
                >{`${sel.collection} · ${daysLeft(sel.ends_at)}`}</Text>
              ) : null}
            </View>
            <RarityTag rarity={sel.rarity} />
          </View>
          {action()}
        </View>
      ) : null}
      {sel && !sel.owned && sel.price > 0 ? (
        <OrderSheet
          visible={confirmBuy}
          title={sel.name}
          icon="bag-check"
          lines={[
            { label: "Objet", value: `${TYPE_LABELS[sel.type]} · ${RARITY[sel.rarity].label}` },
            { label: "Tes pièces", value: `${shop.coins}` },
            { label: "Il t'en restera", value: `${shop.coins - sel.price}` },
          ]}
          total={{ label: "Prix", value: `${sel.price} pièces` }}
          notes={[
            "Les pièces se gagnent en jouant : aucun argent réel n'est débité. Un objet acheté reste à toi, il n'est ni remboursable ni échangeable.",
          ]}
          confirm={`Confirmer l'achat · ${sel.price} pièces`}
          busy={busy}
          onClose={() => setConfirmBuy(false)}
          onConfirm={() => {
            setConfirmBuy(false);
            run(
              () => bought(post(`/shop/${sel.id}/buy`)),
              "Acheté ! Équipe-le pour le montrer.",
            );
          }}
        />
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  name: {
    ...font.extrabold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.chalk,
  },
  wallet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  walletUnit: {
    ...font.semibold,
    fontSize: 11,
    color: colors.dim,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  mini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 10,
    overflow: "hidden",
  },
  miniName: { ...font.extrabold, fontSize: 16, color: colors.chalk },
  panelTitle: { ...font.extrabold, fontSize: 18, color: colors.ink, flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48%",
    flexGrow: 1,
    maxWidth: "50%",
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 10,
    gap: 6,
  },
  tileOn: { backgroundColor: colors.tint, borderWidth: 2.5 },
  tileName: { ...font.bold, fontSize: 13.5, color: colors.ink },
  owned: { ...font.bold, fontSize: 12, color: colors.success },
  timer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.night,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  timerText: { ...font.bold, fontSize: 11, color: colors.chalk },
});
