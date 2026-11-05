"use client";
// Bloc de publicité Google AdSense, et lien « Gérer mes cookies » qui rouvre le choix de consentement.
// Le message de consentement lui-même est celui de Google (activé dans AdSense > Confidentialité et messages).
import { useEffect } from "react";
import { ADS, adsOn } from "../ads";

type AdWindow = Window & {
  adsbygoogle?: unknown[];
  googlefc?: { callbackQueue?: (() => void)[]; showRevocationMessage?: () => void };
};

// Balise écrite telle quelle dans le HTML de chaque page : c'est là que le robot d'AdSense la cherche pour valider le site.
export function AdScript() {
  if (!adsOn) return null;
  return <script async crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS.client}`} />;
}

export function AdBlock() {
  useEffect(() => {
    if (!adsOn || !ADS.slot) return;
    const w = window as AdWindow;
    (w.adsbygoogle = w.adsbygoogle || []).push({});
  }, []);
  if (!adsOn || !ADS.slot) return null;
  return (
    <aside className="ad" aria-label="Publicité">
      <span className="ad__label">Publicité</span>
      <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={ADS.client} data-ad-slot={ADS.slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}

export function CookieLink() {
  if (!adsOn) return null;
  const open = () => {
    const w = window as AdWindow;
    w.googlefc = w.googlefc || {};
    (w.googlefc.callbackQueue = w.googlefc.callbackQueue || []).push(() => w.googlefc?.showRevocationMessage?.());
  };
  return (
    <button type="button" className="footer__btn" onClick={open}>
      Gérer mes cookies
    </button>
  );
}
