import Image from "next/image";
import Waitlist from "./components/Waitlist";

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

const formats = [
  { name: "City", players: "5 vs 5", where: "Playground, terrain de quartier" },
  { name: "Futsal", players: "5 vs 5", where: "Gymnase, salle couverte" },
  { name: "Foot à 8", players: "8 vs 8", where: "Demi-terrain, synthétique" },
  { name: "Foot à 11", players: "11 vs 11", where: "Grand terrain, herbe ou synthé" },
];

const features = [
  ["Matchs autour de toi", "Filtre par distance, date, format et niveau."],
  ["Inscriptions en un geste", "Les places se remplissent en direct, avec liste d'attente."],
  ["Profil et stats", "Trophées, buts, titres d'homme du match."],
  ["Fil d'actualité", "Les résultats et les exploits de ton équipe."],
];

function Pitch({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect x="40" y="40" width="920" height="560" rx="4" />
      <line x1="500" y1="40" x2="500" y2="600" />
      <circle cx="500" cy="320" r="88" />
      <rect x="40" y="190" width="150" height="260" />
      <rect x="40" y="260" width="55" height="120" />
      <path d="M190 262 A88 88 0 0 1 190 378" />
      <rect x="810" y="190" width="150" height="260" />
      <rect x="905" y="260" width="55" height="120" />
      <path d="M810 262 A88 88 0 0 0 810 378" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
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
        <a className="nav__cta" href="#rejoindre">
          Rejoindre
        </a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero__stripes" aria-hidden="true" />
          <Pitch className="hero__pitch" />
          <div className="hero__inner">
            <div className="hero__text">
              <p className="eyebrow">Bientôt sur iOS et Android</p>
              <h1>
                Le foot amateur, <em>partout</em>, sur tous les terrains.
              </h1>
              <p className="lead">
                Supercity, c&apos;est l&apos;appli pour créer ton équipe, organiser tes matchs et trouver des
                joueurs près de chez toi. City, futsal, 8 vs 8 ou 11 vs 11 : tu choisis le terrain, on
                s&apos;occupe du reste.
              </p>
              <Waitlist />
            </div>
            <div className="hero__crest">
              <Image src="/logo-blanc.png" alt="Écusson Supercity" width={418} height={520} priority />
            </div>
          </div>
        </section>

        <section className="section" id="concept">
          <p className="kicker">Le concept</p>
          <h2>Trois étapes entre toi et le prochain match.</h2>
          <ol className="steps">
            {steps.map((s) => (
              <li key={s.n} className="step">
                <span className="step__n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="band" id="formats">
          <div className="section">
          <p className="kicker">Formats</p>
          <h2>Tous les formats, tous les terrains.</h2>
          <div className="formats">
            {formats.map((f) => (
              <article key={f.name} className="format">
                <Pitch className="format__pitch" />
                <p className="format__players">{f.players}</p>
                <h3>{f.name}</h3>
                <p>{f.where}</p>
              </article>
            ))}
          </div>
          </div>
        </section>

        <section className="section app" id="appli">
          <div className="app__visual">
            <Image
              src="/app-mockup.jpg"
              alt="Aperçu de l'application Supercity : profil joueur, statistiques et fil d'actualité"
              width={1200}
              height={694}
            />
          </div>
          <div className="app__text">
            <p className="kicker">L&apos;appli</p>
            <h2>Ton équipe dans la poche.</h2>
            <ul className="features">
              {features.map(([t, d]) => (
                <li key={t}>
                  <b>{t}</b>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="join" id="rejoindre">
          <div className="join__text">
            <h2>Rejoins-nous.</h2>
            <p>
              Laisse ton e-mail : tu seras parmi les premiers à jouer quand l&apos;appli sortira.
            </p>
            <Waitlist dark />
          </div>
          <div className="join__poster">
            <Image src="/affiche.jpg" alt="Affiche Supercity « Rejoignez nous » dans un abribus" width={1598} height={1122} />
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Créer ton équipe. Organiser tes matchs. Partout, sur tous les terrains.</span>
        <span>© Supercity 2026</span>
      </footer>
    </>
  );
}
