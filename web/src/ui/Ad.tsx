// Publicité Google AdSense, réglée dans ads.config.json (à la racine du dépôt, partagé avec le site).
// Sans identifiants, rien n'est chargé : ni publicité, ni cookie. Le message de consentement est celui de Google
// (AdSense > Confidentialité et messages), affiché par son script au premier chargement.
import { useEffect, useRef } from 'react';
import config from '../../../ads.config.json';

const CLIENT = config.client.trim();
const SLOT = config.slot.trim();
export const adsOn = CLIENT.startsWith('ca-pub-') && SLOT !== '';

type AdWindow = Window & {
  adsbygoogle?: unknown[];
  googlefc?: { callbackQueue?: (() => void)[]; showRevocationMessage?: () => void };
};

let loaded = false;
function loadScript() {
  if (loaded) return;
  loaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  document.head.appendChild(s);
}

/** Chargé au démarrage de l'appli, pour que le choix des cookies s'affiche dès la première visite. */
export function initAds() {
  if (adsOn) loadScript();
}

/** Un emplacement publicitaire, signalé comme tel. */
export function Ad({ className }: { className?: string }) {
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => {
    if (!adsOn || !ref.current || ref.current.dataset.adsbygoogleStatus) return;
    loadScript();
    const w = window as AdWindow;
    try {
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      /* bloqueur de publicité : on laisse l'emplacement vide */
    }
  }, []);
  if (!adsOn) return null;
  return (
    <aside className={`ad${className ? ` ${className}` : ''}`} aria-label="Publicité">
      <span className="ad__label">Publicité</span>
      <ins ref={ref} className="adsbygoogle" style={{ display: 'block' }} data-ad-client={CLIENT} data-ad-slot={SLOT} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}

/** Rouvre le choix des cookies de Google. */
export function openCookieChoices() {
  const w = window as AdWindow;
  w.googlefc = w.googlefc || {};
  (w.googlefc.callbackQueue = w.googlefc.callbackQueue || []).push(() => w.googlefc?.showRevocationMessage?.());
}
