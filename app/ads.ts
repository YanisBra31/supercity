// Publicités Google AdSense : réglées dans ads.config.json (partagé avec l'appli web).
import config from "../ads.config.json";

export const ADS = { client: config.client.trim(), slot: config.slot.trim() };
export const adsOn = ADS.client.startsWith("ca-pub-");
