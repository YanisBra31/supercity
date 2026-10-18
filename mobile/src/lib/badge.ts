// Pastilles de l'appli (notifications non lues, demandes d'ami), partagées par tous les écrans.
// Rafraîchies toutes les minutes tant que l'appli est ouverte : ça garde aussi le joueur « en ligne » pour ses amis.
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Badge, get } from './api';

let current: Badge = { unread: 0, friend_requests: 0 };
const listeners = new Set<(b: Badge) => void>();

export function setBadge(b: Badge) {
  current = b;
  listeners.forEach((l) => l(b));
}

export function refreshBadge() {
  return get<Badge>('/me/badge')
    .then(setBadge)
    .catch(() => undefined);
}

export function useBadge(): Badge {
  const [b, setB] = useState(current);
  useEffect(() => {
    listeners.add(setB);
    return () => {
      listeners.delete(setB);
    };
  }, []);
  return b;
}

/** À brancher une fois, à la racine : interroge l'API toutes les minutes, et au retour dans l'appli. */
export function useBadgePolling(userId: number | null) {
  useEffect(() => {
    if (!userId) {
      setBadge({ unread: 0, friend_requests: 0 });
      return;
    }
    refreshBadge();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refreshBadge();
    }, 60_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshBadge();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [userId]);
}
