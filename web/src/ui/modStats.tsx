// Administration : ce que rapportent les liens de match partagés (supercity.fr/m/12?src=tiktok).
// Vues de la page, comptes créés depuis la page, inscriptions au match, par source et par match.
import { BarChart3, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, get } from '../lib/api';
import { whenLabel } from '../lib/format';
import { Button, Card, Chips, Empty, ErrorText, Kicker, Loading } from './ui';

type Counts = { views: number; accounts: number; joins: number };
type PageStats = {
  from: string;
  days: number;
  total: Counts;
  by_source: (Counts & { src: string })[];
  by_match: (Counts & { match_id: number; label: string; starts_at: string; venue: string; url: string })[];
  rows: (Counts & { day: string; match_id: number; src: string })[];
};

const PERIODS = [
  { value: 1, label: "Aujourd'hui" },
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
  { value: 90, label: '90 jours' },
];

const rate = (n: number, of: number) => (of > 0 ? `${Math.round((100 * n) / of)} %` : '—');

function csv(s: PageStats): string {
  const lines = [['jour', 'match', 'lien', 'source', 'vues', 'comptes_crees', 'inscriptions'].join(';')];
  for (const r of s.rows) lines.push([r.day, r.match_id, `https://supercity.fr/m/${r.match_id}`, r.src, r.views, r.accounts, r.joins].join(';'));
  return '﻿' + lines.join('\n');
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="stats-table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h} style={{ textAlign: i ? 'right' : 'left' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} style={{ textAlign: j ? 'right' : 'left' }}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ModStats() {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<PageStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setStats(null);
    setError('');
    get<PageStats>('/admin/page-stats', { days })
      .then(setStats)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Chargement impossible.'));
  }, [days]);

  const download = () => {
    if (!stats) return;
    const url = URL.createObjectURL(new Blob([csv(stats)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `supercity-pages-match-${stats.from}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <>
      <p className="sub" style={{ margin: 0 }}>
        Visites des liens de match partagés (supercity.fr/m/12). Ajoute <b>?src=tiktok</b>, <b>?src=insta</b> ou <b>?src=affiche</b> au lien pour savoir d'où viennent les joueurs. Sans
        paramètre, la source est « direct ». Robots et aperçus de liens ne sont pas comptés.
      </p>
      <Chips label="Période" options={PERIODS} value={days} onChange={(v) => v && setDays(v)} />
      <ErrorText>{error}</ErrorText>
      {!stats && !error ? <Loading /> : null}
      {stats ? (
        stats.total.views + stats.total.accounts + stats.total.joins === 0 ? (
          <Empty icon={BarChart3} title="Pas encore de visite" text="Partage un lien de match pour voir les chiffres arriver ici." />
        ) : (
          <>
            <Card>
              <dl className="stats-kpis">
                <div>
                  <dd>{stats.total.views}</dd>
                  <dt>vues</dt>
                </div>
                <div>
                  <dd>{stats.total.accounts}</dd>
                  <dt>comptes créés</dt>
                </div>
                <div>
                  <dd>{stats.total.joins}</dd>
                  <dt>inscriptions</dt>
                </div>
              </dl>
              <p className="sub" style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 13 }}>
                {rate(stats.total.joins, stats.total.views)} des visites finissent en inscription au match
              </p>
            </Card>
            <Kicker>Par source</Kicker>
            <Card>
              <Table head={['Source', 'Vues', 'Comptes', 'Inscrits']} rows={stats.by_source.map((s) => [s.src, s.views, s.accounts, s.joins])} />
            </Card>
            <Kicker>Par match</Kicker>
            <Card>
              <Table
                head={['Match', 'Vues', 'Comptes', 'Inscrits']}
                rows={stats.by_match.map((m) => [`${m.label} · ${whenLabel(m.starts_at)} · ${m.venue} (/m/${m.match_id})`, m.views, m.accounts, m.joins])}
              />
            </Card>
            <Button variant="dark" icon={Download} onClick={download}>
              Exporter en CSV
            </Button>
          </>
        )
      ) : null}
    </>
  );
}
