// Pastilles (notifications non lues, demandes d'ami), partagées par toute l'appli.
// Rafraîchies chaque minute tant que l'onglet est visible : ça garde aussi le joueur « en ligne » pour ses amis.
import { useEffect, useSyncExternalStore } from 'react';
import { Badge, get } from './api';

let current: Badge = { unread: 0, friend_requests: 0 };
const listeners = new Set<() => void>();

export function setBadge(b: Badge) {
  current = b;
  listeners.forEach((l) => l());
}

export function refreshBadge() {
  return get<Badge>('/me/badge')
    .then(setBadge)
    .catch(() => undefined);
}

export function useBadge(): Badge {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current
  );
}

/** À brancher une fois, à la racine. */
export function useBadgePolling(userId: number | null) {
  useEffect(() => {
    if (!userId) {
      setBadge({ unread: 0, friend_requests: 0 });
      return;
    }
    refreshBadge();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshBadge();
    }, 60_000);
    const onVisible = () => document.visibilityState === 'visible' && refreshBadge();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);
}
