import type { Metadata } from "next";
import Image from "next/image";
import Waitlist from "../components/Waitlist";
import Vitrine from "../components/Vitrine";
import Footer from "../components/Footer";
import { AdBlock } from "../components/Ads";
import "./vitrine.css";

const steps = [
  {
    n: "01",
    title: "Crée ton équipe",
    text: "Donne-lui un nom, un logo, et invite tes potes avec un simple lien.",
  },
  {
    n: "02",
    title: "Organise ou trouve un match",
    text: "Publie un match sur ton terrain, ou rejoins ceux qui se jouent près de chez toi.",
  },
  {
    n: "03",
    title: "Joue et fais monter tes stats",
    text: "Scores, victoires, buts : ton profil garde la trace de chaque match.",
  },
];

// Lignes de joueurs du gardien vers l'attaque, pour placer les pions sur le mini-terrain.
const formats = [
  { name: "City", players: "5 vs 5", where: "Playground, terrain de quartier", lines: [1, 2, 2] },
  { name: "Futsal", players: "5 vs 5", where: "Gymnase, salle couverte", lines: [1, 2, 1, 1] },
  { name: "Foot à 8", players: "8 vs 8", where: "Demi-terrain, synthétique", lines: [1, 3, 3, 1] },
  { name: "Foot à 11", players: "11 vs 11", where: "Grand terrain, herbe ou synthé", lines: [1, 4, 3, 3] },
];

const videos = [
  { src: "defi", title: "Le défi", text: "Trois ans qu'ils chambrent. Le défi part en deux clics." },
  { src: "forfait", title: "Le forfait", text: "Un joueur se désiste, la place repart tout de suite." },
  { src: "grade", title: "Monte en grade", text: "Chaque match joué te fait grimper, de Rookie à Légende." },
];

const marquee = ["City", "Futsal", "8 vs 8", "11 vs 11", "Partout", "Sur tous les terrains"];

function formation(lines: number[]) {
  const pts: { x: number; y: number; team: 0 | 1 }[] = [];
  lines.forEach((count, li) => {
    const x = 7 + (li / Math.max(1, lines.length - 1)) * 36;
    for (let k = 0; k < count; k++) {
      const y = ((k + 1) / (count + 1)) * 100;
      pts.push({ x, y, team: 0 });
      pts.push({ x: 100 - x, y: 100 - y, team: 1 });
    }
  });
  return pts;
}

function Pitch({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect x="40" y="40" width="920" height="560" rx="4" pathLength={1} />
      <line x1="500" y1="40" x2="500" y2="600" pathLength={1} />
      <circle cx="500" cy="320" r="88" pathLength={1} />
      <rect x="40" y="190" width="150" height="260" pathLength={1} />
      <rect x="40" y="260" width="55" height="120" pathLength={1} />
      <path d="M190 262 A88 88 0 0 1 190 378" pathLength={1} />
      <rect x="810" y="190" width="150" height="260" pathLength={1} />
      <rect x="905" y="260" width="55" height="120" pathLength={1} />
      <path d="M810 262 A88 88 0 0 0 810 378" pathLength={1} />
    </svg>
  );
}

function Phone({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`v-phone ${className}`}>
      <img src={`/vitrine/${src}.webp`} alt={alt} width={585} height={1266} loading="eager" decoding="async" />
    </div>
  );
}

export const metadata: Metadata = {
  title: { absolute: "Supercity · Trouve un match de foot près de chez toi (city, futsal, 5, 8 ou 11)" },
  description:
    "Supercity, l'appli gratuite du foot amateur : trouve un match de city ou de futsal près de chez toi, organise le tien, monte ton équipe et défie celles du quartier.",
  alternates: { canonical: "/decouvrir/" },
};

// Présentation de Supercity, aussi servie sur supercity.fr (voir app/page.tsx).
export default function Home() {
  return (
    <div className="v">
      <Vitrine />
      <header className="nav">
        <a className="nav__brand" href="#top" aria-label="Supercity, haut de page">
          <Image src="/logo-blanc.png" alt="" width={34} height={42} />
          <span>Supercity</span>
        </a>
        <nav className="nav__links" aria-label="Sections">
          <a href="#concept">Le concept</a>
          <a href="#formats">Formats</a>
          <a href="#appli">L&apos;appli</a>
          <a href="#videos">Vidéos</a>
        </nav>
        <a className="nav__cta" href="/app/">
          Ouvrir l&apos;appli
        </a>
      </header>

      <main>
        <section className="v-hero" id="top">
          <div className="v-aurora" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="v-grain" aria-hidden="true" />

          <div className="v-hero__inner">
            <div className="v-hero__text">
              <p className="v-pill v-in" style={{ "--d": 0 } as React.CSSProperties}>
                <span className="v-live" aria-hidden="true" />
                Disponible sur le web · iOS et Android bientôt
              </p>
              <h1 className="v-in" style={{ "--d": 1 } as React.CSSProperties}>
                Le foot amateur, <em>partout,</em> sur tous les terrains.
              </h1>
              <p className="v-lead v-in" style={{ "--d": 2 } as React.CSSProperties}>
                Supercity, c&apos;est l&apos;appli pour créer ton équipe, organiser tes matchs et trouver des joueurs près
                de chez toi. City, futsal, 8 vs 8 ou 11 vs 11 : tu choisis le terrain, on s&apos;occupe du reste.
              </p>
              <div className="v-actions v-in" style={{ "--d": 3 } as React.CSSProperties}>
                <a className="v-btn v-btn--hot" href="/app/register">
                  Créer mon compte gratuit
                </a>
                <a className="v-btn v-btn--glass" href="#videos">
                  <span className="v-btn__play" aria-hidden="true" />
                  Voir en vidéo
                </a>
              </div>
              <ul className="v-facts v-in" style={{ "--d": 4 } as React.CSSProperties}>
                <li>Gratuit</li>
                <li>Dans ton navigateur</li>
                <li>Ordi et téléphone</li>
              </ul>
            </div>

            <div className="v-stage" aria-hidden="true">
              <div className="v-scene">
                <div className="v-field">
                  <Pitch className="v-field__lines" />
                  <span className="v-field__glow" />
                </div>
                <span className="v-ball">
                  <span className="v-ball__core" />
                </span>
                <span className="v-ball__shadow" />
                <Phone src="organiser" alt="" className="v-phone--l" />
                <Phone src="equipe" alt="" className="v-phone--c" />
                <Phone src="grade" alt="" className="v-phone--r" />
                <span className="v-chip v-chip--1">🔥 6 victoires d&apos;affilée</span>
                <span className="v-chip v-chip--2">✅ Une place s&apos;est libérée</span>
                <span className="v-chip v-chip--3">🛡️ Nouveau grade : Cadre</span>
              </div>
            </div>
          </div>
        </section>

        <div className="v-marquee" aria-hidden="true">
          <div className="v-marquee__track">
            {[0, 1].map((r) => (
              <span key={r} className="v-marquee__group">
                {marquee.map((m) => (
                  <span key={m} className="v-marquee__item">
                    {m}
                    <i />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <section className="v-section" id="concept">
          <p className="v-kicker" data-reveal>
            Le concept
          </p>
          <h2 data-reveal>Trois étapes entre toi et le prochain match.</h2>
          <ol className="v-steps">
            {steps.map((s, i) => (
              <li key={s.n} className="v-card v-step" data-reveal data-tilt style={{ "--i": i } as React.CSSProperties}>
                <span className="v-step__n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="v-band" id="formats">
          <div className="v-section">
            <p className="v-kicker" data-reveal>
              Formats
            </p>
            <h2 data-reveal>Tous les formats, tous les terrains.</h2>
            <div className="v-formats">
              {formats.map((f, i) => (
                <article key={f.name} className="v-format" data-reveal data-tilt style={{ "--i": i } as React.CSSProperties}>
                  <Pitch className="v-format__pitch" />
                  <div className="v-format__dots" aria-hidden="true">
                    {formation(f.lines).map((pt, k) => (
                      <span
                        key={k}
                        className={`v-dot v-dot--${pt.team}`}
                        style={{ "--x": `${pt.x}%`, "--y": `${pt.y}%`, "--d": k } as React.CSSProperties}
                      />
                    ))}
                  </div>
                  <p className="v-format__players">{f.players}</p>
                  <h3>{f.name}</h3>
                  <p className="v-format__where">{f.where}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="v-section" id="appli">
          <p className="v-kicker" data-reveal>
            L&apos;appli
          </p>
          <h2 data-reveal>Ton équipe dans la poche, et sur ton ordi.</h2>
          <div className="v-bento">
            <article className="v-card v-tile v-tile--big" data-reveal data-spot>
              <div className="v-tile__text">
                <h3>Matchs autour de toi</h3>
                <p>Filtre par distance, date, format et niveau. Tu vois tout de suite combien de places il reste.</p>
              </div>
              <Phone src="match" alt="Écran d'un match de city à 20h, 10 joueurs sur 10, avec la discussion du match" className="v-tile__phone" />
            </article>
            <article className="v-card v-tile" data-reveal data-spot style={{ "--i": 1 } as React.CSSProperties}>
              <div className="v-tile__text">
                <h3>Inscriptions en un geste</h3>
                <p>Les places se remplissent en direct, avec liste d&apos;attente. Si quelqu&apos;un se désiste, le suivant est prévenu.</p>
              </div>
              <div className="v-notif">
                <b>Une place s&apos;est libérée</b>
                <span>City stade des Minimes · 20h00. Tu es inscrit !</span>
              </div>
            </article>
            <article className="v-card v-tile" data-reveal data-spot style={{ "--i": 2 } as React.CSSProperties}>
              <div className="v-tile__text">
                <h3>Amis et discussions</h3>
                <p>Vois qui est en ligne, invite tes potes, discute avant le match.</p>
              </div>
              <div className="v-chat">
                <span className="v-chat__in">On est combien ce soir ?</span>
                <span className="v-chat__out">10/10, complet 🔥</span>
                <span className="v-chat__in">Je ramène les chasubles</span>
              </div>
            </article>
            <article className="v-card v-tile v-tile--wide" data-reveal data-spot style={{ "--i": 3 } as React.CSSProperties}>
              <div className="v-tile__text">
                <h3>Profil et stats</h3>
                <p>Grade, carte joueur, trophées et défis entre équipes. Chaque match joué te fait monter, de Rookie à Légende.</p>
                <ol className="v-grades" aria-label="Grades">
                  {["Rookie", "Espoir", "Titulaire", "Cadre", "Star", "Légende"].map((g, i) => (
                    <li key={g} style={{ "--i": i } as React.CSSProperties}>
                      {g}
                    </li>
                  ))}
                </ol>
              </div>
              <Phone src="profil" alt="Profil joueur : grade Cadre, 10 matchs joués et 8 organisés" className="v-tile__phone" />
            </article>
          </div>
          <a className="v-btn v-btn--hot v-center" href="/app/" data-reveal>
            Ouvrir l&apos;appli
          </a>
        </section>

        <section className="v-section v-videos" id="videos">
          <p className="v-kicker" data-reveal>
            En vidéo
          </p>
          <h2 data-reveal>Supercity, sur le terrain.</h2>
          <div className="v-reels">
            {videos.map((v, i) => (
              <figure key={v.src} className="v-reel" data-reveal data-tilt style={{ "--i": i } as React.CSSProperties}>
                <div className="v-reel__screen">
                  <video
                    src={`/vitrine/video-${v.src}.mp4`}
                    poster={`/vitrine/video-${v.src}.jpg`}
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-label={`Vidéo : ${v.title}`}
                  />
                  <button type="button" className="v-reel__sound" aria-label="Activer le son" data-sound>
                    <span aria-hidden="true">🔇</span>
                  </button>
                </div>
                <figcaption>
                  <b>{v.title}</b>
                  <span>{v.text}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="v-section" id="rejoindre">
          <div className="v-join" data-reveal>
            <div className="v-join__text">
              <h2>Rejoins-nous.</h2>
              <p>
                Supercity se joue déjà sur <a href="/app/">supercity.fr/app</a>. Laisse ton e-mail pour être prévenu de la
                sortie sur iOS et Android.
              </p>
              <Waitlist dark />
            </div>
            <div className="v-join__poster">
              <Image src="/affiche.jpg" alt="Affiche Supercity « Rejoignez nous » dans un abribus" width={1598} height={1122} />
            </div>
          </div>
        </section>
      </main>

      <AdBlock />
      <Footer />
    </div>
  );
}
