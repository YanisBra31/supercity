import { Fragment } from "react";
import Image from "next/image";
import Waitlist from "./components/Waitlist";
import Motion from "./components/Motion";
import Loader, { Ball } from "./components/Loader";
import Footer from "./components/Footer";

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

const features = [
  ["Matchs autour de toi", "Filtre par distance, date, format et niveau."],
  ["Inscriptions en un geste", "Les places se remplissent en direct, avec liste d'attente."],
  ["Amis et discussions", "Vois qui est en ligne, invite tes potes, discute avant le match."],
  ["Profil et stats", "Grade, carte joueur, trophées et défis entre équipes."],
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

function Words({ text, start = 0 }: { text: string; start?: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <Fragment key={i}>
          <span className="word" style={{ "--i": start + i } as React.CSSProperties}>
            <span>{w}</span>
          </span>{" "}
        </Fragment>
      ))}
    </>
  );
}

export default function Home() {
  return (
    <>
      <Loader />
      <Motion />
      <header className="nav">
        <a className="nav__brand" href="#top" aria-label="Supercity, accueil">
          <Image src="/logo-blanc.png" alt="" width={34} height={42} />
          <span>Supercity</span>
        </a>
        <nav className="nav__links" aria-label="Sections">
          <a href="#concept">Le concept</a>
          <a href="#formats">Formats</a>
          <a href="#appli">L&apos;appli</a>
        </nav>
        <div className="nav__actions">
          <a className="nav__login" href="/app/">
            Se connecter
          </a>
          <a className="nav__cta" href="/app/">
            Ouvrir l&apos;appli
          </a>
        </div>
      </header>

      <main>
        <section className="hero" id="top">
          <div className="hero__stripes" aria-hidden="true" />
          <Pitch className="hero__pitch" />
          <div className="hero__inner">
            <div className="hero__text">
              <p className="eyebrow">
                <span className="live-dot" aria-hidden="true" />
                Disponible sur le web · iOS et Android bientôt
              </p>
              <h1>
                <Words text="Le foot amateur," />
                <em>
                  <Words text="partout," start={3} />
                </em>
                <Words text="sur tous les terrains." start={4} />
              </h1>
              <p className="lead">
                Supercity, c&apos;est l&apos;appli pour créer ton équipe, organiser tes matchs et trouver des
                joueurs près de chez toi. City, futsal, 8 vs 8 ou 11 vs 11 : tu choisis le terrain, on
                s&apos;occupe du reste.
              </p>
              <div className="hero__form hero__actions">
                <a className="btn btn--dark" href="/app/register">
                  Créer mon compte
                </a>
                <a className="btn btn--light" href="/app/">
                  J&apos;ai déjà un compte
                </a>
              </div>
              <p className="hero__note">Gratuit, dans ton navigateur, sur ordinateur comme sur téléphone.</p>
            </div>
            <div className="hero__crest" data-parallax>
              <Image src="/logo-blanc.png" alt="Écusson Supercity" width={418} height={520} priority />
            </div>
          </div>
          <a className="hero__scroll" href="#concept" aria-label="Descendre vers le concept">
            <span className="hero__scroll-ball">
              <Ball />
            </span>
          </a>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee__track">
            {[0, 1].map((r) => (
              <span key={r} className="marquee__group">
                {marquee.map((m) => (
                  <span key={m} className="marquee__item">
                    {m}
                    <i />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <section className="section" id="concept">
          <p className="kicker" data-reveal>
            Le concept
          </p>
          <h2 data-reveal>Trois étapes entre toi et le prochain match.</h2>
          <div className="steps-wrap" data-reveal>
            <svg className="steps__pass" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
              <path d="M165 100 C 300 -10, 400 -10, 500 60 S 700 130, 835 30" pathLength={1} vectorEffect="non-scaling-stroke" />
            </svg>
            <ol className="steps">
              {steps.map((s, i) => (
                <li key={s.n} className="step" style={{ "--i": i } as React.CSSProperties}>
                  <span className="step__n">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band" id="formats">
          <div className="section">
            <p className="kicker" data-reveal>
              Formats
            </p>
            <h2 data-reveal>Tous les formats, tous les terrains.</h2>
            <div className="formats">
              {formats.map((f, i) => (
                <article key={f.name} className="format" data-reveal style={{ "--i": i } as React.CSSProperties}>
                  <Pitch className="format__pitch" />
                  <div className="format__players-dots" aria-hidden="true">
                    {formation(f.lines).map((pt, k) => (
                      <span
                        key={k}
                        className={`dot dot--${pt.team}`}
                        style={{ "--x": `${pt.x}%`, "--y": `${pt.y}%`, "--d": k } as React.CSSProperties}
                      />
                    ))}
                  </div>
                  <p className="format__players">{f.players}</p>
                  <h3>{f.name}</h3>
                  <p className="format__where">{f.where}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section app" id="appli">
          <div className="app__visual" data-reveal>
            <div className="app__phone" data-parallax>
              <Image
                src="/app-mockup.jpg"
                alt="Aperçu de l'application Supercity : profil joueur, statistiques et fil d'actualité"
                width={1200}
                height={694}
              />
            </div>
          </div>
          <div className="app__text">
            <p className="kicker" data-reveal>
              L&apos;appli
            </p>
            <h2 data-reveal>Ton équipe dans la poche, et sur ton ordi.</h2>
            <ul className="features">
              {features.map(([t, d], i) => (
                <li key={t} data-reveal style={{ "--i": i } as React.CSSProperties}>
                  <b>{t}</b>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
            <a className="btn btn--orange" href="/app/" data-reveal>
              Ouvrir l&apos;appli
            </a>
          </div>
        </section>

        <section className="join" id="rejoindre">
          <div className="join__text" data-reveal>
            <h2>Rejoins-nous.</h2>
            <p>
              Supercity se joue déjà sur <a href="/app/">supercity.fr/app</a>. Laisse ton e-mail pour être prévenu de la
              sortie sur iOS et Android.
            </p>
            <Waitlist dark />
          </div>
          <div className="join__poster" data-reveal data-parallax>
            <Image src="/affiche.jpg" alt="Affiche Supercity « Rejoignez nous » dans un abribus" width={1598} height={1122} />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
