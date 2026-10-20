// supercity.fr/ads.txt : déclare Google comme seul vendeur autorisé des espaces pub du site.
import { ADS, adsOn } from "../ads";

export const dynamic = "force-static";

export function GET() {
  const body = adsOn ? `google.com, ${ADS.client.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n` : "# Pas encore de publicité sur ce site.\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
