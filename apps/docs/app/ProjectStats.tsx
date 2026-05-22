'use client';

import { useEffect, useState } from 'react';

interface Stats {
  stars: number | null;
  forks: number | null;
  openIssues: number | null;
  lastCommit: string | null;
  weeklyDownloads: number | null;
  monthlyDownloads: number | null;
}

function fmt(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function ProjectStats() {
  const [stats, setStats] = useState<Stats>({
    stars: null, forks: null, openIssues: null, lastCommit: null,
    weeklyDownloads: null, monthlyDownloads: null,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ghFetch = fetch('https://api.github.com/repos/DhruvilChauahan0210/local-ghost')
      .then(r => r.json())
      .catch(() => null);

    const npmWeekly = fetch('https://api.npmjs.org/downloads/point/last-week/@dhruvil0210/local-ghost')
      .then(r => r.json())
      .catch(() => null);

    const npmMonthly = fetch('https://api.npmjs.org/downloads/point/last-month/@dhruvil0210/local-ghost')
      .then(r => r.json())
      .catch(() => null);

    const ghCommits = fetch('https://api.github.com/repos/DhruvilChauahan0210/local-ghost/commits?per_page=1')
      .then(r => r.json())
      .catch(() => null);

    Promise.all([ghFetch, npmWeekly, npmMonthly, ghCommits]).then(([gh, week, month, commits]) => {
      setStats({
        stars:            gh?.stargazers_count   ?? null,
        forks:            gh?.forks_count        ?? null,
        openIssues:       gh?.open_issues_count  ?? null,
        lastCommit:       Array.isArray(commits) ? commits[0]?.commit?.committer?.date ?? null : null,
        weeklyDownloads:  week?.downloads        ?? null,
        monthlyDownloads: month?.downloads       ?? null,
      });
      setLoaded(true);
    }).catch(() => {
      setLoaded(true);
    });
  }, []);

  const items = [
    { label: 'GH STARS',      value: fmt(stats.stars),            icon: '★' },
    { label: 'FORKS',         value: fmt(stats.forks),            icon: '⑂' },
    { label: 'OPEN ISSUES',   value: fmt(stats.openIssues),       icon: '◎' },
    { label: 'LAST COMMIT',   value: timeAgo(stats.lastCommit),   icon: '⟳' },
    { label: 'NPM / WEEK',    value: fmt(stats.weeklyDownloads),  icon: '↓' },
    { label: 'NPM / MONTH',   value: fmt(stats.monthlyDownloads), icon: '↓' },
  ];

  return (
    <section className="live-stats-section">
      <div className="live-stats-label">
        <span className={`live-dot ${loaded ? 'live-dot--on' : ''}`} />
        LIVE PROJECT STATS
      </div>

      <div className="live-stats-grid">
        {items.map(({ label, value, icon }) => (
          <div key={label} className="live-stat">
            <div className="live-stat-icon">{icon}</div>
            <div className={`live-stat-value ${!loaded ? 'live-stat-loading' : ''}`}>
              {loaded ? value : '···'}
            </div>
            <div className="live-stat-label">{label}</div>
          </div>
        ))}
      </div>

      <a
        href="https://github.com/DhruvilChauahan0210/local-ghost"
        target="_blank"
        rel="noreferrer"
        className="star-cta"
      >
        <span className="star-cta-icon">★</span>
        STAR ON GITHUB
      </a>
    </section>
  );
}
