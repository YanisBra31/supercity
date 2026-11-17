import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import '@fontsource/poppins/900.css';
import './styles.css';
import './styles-matches.css';
import './styles-social.css';
import './styles-me.css';
import './styles-vitrine.css';
import { StrictMode } from 'react';
import { captureSource } from './lib/source';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initAds } from './ui/Ad';

initAds();
// Arrivé par le lien d'un match partagé : on retient d'où (avant que l'appli ne change l'adresse).
captureSource();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
