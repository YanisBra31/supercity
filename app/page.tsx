// supercity.fr ouvre directement l'appli : écran de connexion, ou l'accueil si on est déjà connecté.
// La présentation du projet est sur /decouvrir/.
export default function Root() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/app/" />
      <script dangerouslySetInnerHTML={{ __html: "location.replace('/app/' + location.search + location.hash)" }} />
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f0c0b", color: "#fff8f1" }}>
        <p>
          <a href="/app/" style={{ color: "#ff9417" }}>
            Ouvrir Supercity
          </a>
        </p>
      </main>
    </>
  );
}
