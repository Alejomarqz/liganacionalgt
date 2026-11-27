// components/TeamSummary.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { API_WEB_DEPORT_URL, API_CUSTOM_DIGITAL } from '@env';
import Card from './Card';
import LogoImg from './LogoImg';
import Avatar from './Avatar';
import changeName, { bestPersonNameFromObj } from '../utils/changeName';
import { withTheme } from '../utils/ThemeContext';
import { BRAND } from '../utils/theme';

const BASE   = String(API_WEB_DEPORT_URL || '').replace(/\/+$/, '');
const CUSTOM = String(API_CUSTOM_DIGITAL || '').replace(/\/+$/, '');
const FUTURE = new Set([0]);

/* ─── Utils ──────────────────────────────────────────────── */
const isHHMM       = s => /^\d{2}:\d{2}$/.test(String(s || '').slice(0, 5));
const isPosNum     = v => Number.isFinite(Number(v)) && Number(v) > 0;
const extractTailId = v => { const m = String(v ?? '').match(/(\d{4,})$/); return m ? Number(m[1]) : NaN; };
const firstValidId  = (...vals) => {
  for (const v of vals) {
    const n = typeof v === 'number' ? v : Number(v);
    if (isPosNum(n)) return n;
    const tail = extractTailId(v);
    if (isPosNum(tail)) return tail;
  }
  return NaN;
};
const sanitizeForCard = m => ({
  ...m,
  _dateAdj: String(m._dateAdj || m.date || '').replace(/-/g, '').slice(0, 8),
  scheduledStart: isHHMM(m.scheduledStart) ? String(m.scheduledStart).slice(0, 5) : '',
  gmt: m.gmt != null && isFinite(+m.gmt) ? Number(m.gmt) : null,
});
const pickOverlay = ev => {
  if (!ev || typeof ev !== 'object') return null;
  return {
    statusId: Number(ev.statusId ?? ev?.status?.statusId ?? NaN),
    scoreStatus: ev.scoreStatus ?? null,
    score: ev.score ?? (ev.scoreHA ? { H: Number(ev.scoreHA.H), A: Number(ev.scoreHA.A) } : null),
    scheduledStart: ev.scheduledStart ?? ev.scheduled ?? ev?.match?.scheduledStart ?? null,
    gmt: ev.gmt ?? ev?.match?.gmt ?? null,
  };
};
const mergeOverlay = (m, o) => {
  if (!o) return m;
  return {
    ...m,
    statusId: Number.isFinite(Number(o.statusId)) ? Number(o.statusId) : m.statusId,
    scoreStatus: o.scoreStatus ?? m.scoreStatus ?? null,
    score: o.score ?? m.score ?? null,
    scheduledStart: o.scheduledStart ?? m.scheduledStart ?? null,
    gmt: o.gmt ?? m.gmt ?? null,
  };
};

async function overlayFromEvent(id, scope, bust = false) {
  try {
    const qs = bust ? `?t=${Date.now()}` : '';
    const opts = bust ? { headers: { 'Cache-Control': 'no-cache' } } : {};
    const r = await fetch(`${BASE}/${scope}/events/${id}.json${qs}`, opts);
    if (!r.ok) return {};
    const ev = await r.json();
    return pickOverlay(ev) || {
      statusId: Number(ev?.status?.statusId ?? NaN),
      scoreStatus: ev?.scoreStatus ?? null,
      scheduledStart: ev?.match?.scheduledStart ?? null,
      gmt: ev?.match?.gmt ?? null,
    };
  } catch { return {}; }
}

async function fetchAgendaForTeam(teamId, scope, bust = false) {
  const qs = bust ? `?t=${Date.now()}` : '';
  const opts = bust ? { headers: { 'Cache-Control': 'no-cache' } } : {};
  try {
    const r = await fetch(`${BASE}/${scope}/agendaMaM/agenda_${teamId}.json${qs}`, opts);
    if (r.ok) { const j = await r.json(); return (j && j.events) || j || {}; }
  } catch {}
  try {
    const r2 = await fetch(`${BASE}/${scope}/agenda-jornadas.json${qs}`, opts);
    if (r2.ok) { const j = await r2.json(); return (j && j.events) || j || {}; }
  } catch {}
  return {};
}

function eventToMatch(key, ev, scope) {
  if (!ev || typeof ev !== 'object') return null;
  const id = firstValidId(key, ev.matchId, ev.id, ev.eventId, ev.channel);
  if (!id) return null;
  const t = ev.teams || {};
  return sanitizeForCard({
    channelKey: String(key ?? ''),
    matchId: id, scope,
    date: String(ev.date || '').replace(/-/g, ''),
    _dateAdj: String(ev.date || '').replace(/-/g, ''),
    scheduledStart: String(ev.scheduledStart || ev.scheduled || '').slice(0, 5),
    gmt: ev.gmt,
    statusId: Number(ev.statusId != null ? ev.statusId : 0),
    teams: {
      homeTeamId: t.homeTeamId ?? t.homeId ?? null,
      awayTeamId: t.awayTeamId ?? t.awayId ?? null,
      homeTeamName: changeName(t.homeTeamName || t.homeName || ''),
      awayTeamName: changeName(t.awayTeamName || t.awayName || ''),
    },
    score: ev.score ?? null,
    scoreStatus: ev.scoreStatus ?? null,
  });
}

function resultChipFor(match, teamId) {
  const hid = String(match?.teams?.homeTeamId || '');
  const aid = String(match?.teams?.awayTeamId || '');
  let hs = null, as_ = null;
  if (match?.scoreStatus) {
    const h0 = match.scoreStatus[hid]?.score, a0 = match.scoreStatus[aid]?.score;
    if (Number.isFinite(+h0) && Number.isFinite(+a0)) { hs = +h0; as_ = +a0; }
  }
  if (hs == null && typeof match?.score === 'string') {
    const m = /^\s*(\d+)f?\s*[-:]\s*(\d+)\s*$/.exec(match.score);
    if (m) { hs = +m[1]; as_ = +m[2]; }
  }
  if (hs == null && match?.scoreHA) { hs = +match.scoreHA.H; as_ = +match.scoreHA.A; }
  const isHome = String(teamId) === hid;
  const oppId   = isHome ? match?.teams?.awayTeamId  : match?.teams?.homeTeamId;
  const oppName = isHome ? match?.teams?.awayTeamName : match?.teams?.homeTeamName;
  let res = null, scoreStr = '—';
  if (hs != null && as_ != null) {
    const diff = isHome ? (hs - as_) : (as_ - hs);
    res = diff > 0 ? 'W' : (diff === 0 ? 'D' : 'L');
    scoreStr = isHome ? `${hs}-${as_}` : `${as_}-${hs}`;
  }
  return { res, scoreStr, oppId, oppName: changeName(oppName), matchId: match.matchId };
}

async function fetchTopScorers(teamId, scope) {
  const teamStr = String(teamId);
  const scopeSafe = String(scope || 'guatemala').toLowerCase();
  if (scopeSafe === 'guatemala') {
    if (!CUSTOM) return [];
    try {
      const r = await fetch(`${CUSTOM}/players?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (!r.ok) return [];
      const j = await r.json();
      const list = Array.isArray(j?.goleadores?.persona) ? j.goleadores.persona : [];
      const rows = list.map(p => ({
        playerId: Number(p?.id?.[0] ?? p?.id ?? 0),
        name: bestPersonNameFromObj(p),
        goals: Number(p?.goles?.[0] ?? p?.goles ?? 0),
        teamId: String(p?.equipo?.[0]?.id?.[0] ?? p?.equipo?.id ?? ''),
      })).filter(x => x.playerId && x.teamId === teamStr && x.goals > 0);
      if (!rows.length) return [];
      rows.sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
      return rows.filter(x => x.goals === rows[0].goals);
    } catch { return []; }
  }
  try {
    const r = await fetch(`${BASE}/${scopeSafe}/statsCenter/teams/${teamStr}.json?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) return [];
    const j = await r.json();
    const entries = j?.players ? Object.entries(j.players).map(([pid, obj]) => ({ pid, ...obj })) : [];
    const rows = entries.map(p => {
      const pid = Number(p?.pid ?? p?.playerId ?? p?.id);
      const goals = Number((p?.summary?.goals && (p.summary.goals.qty ?? p.summary.goals)) ?? 0);
      const n = p?.info?.name || {};
      const name = (n.nick && String(n.nick).trim()) || [n.first, n.last].filter(Boolean).join(' ').trim();
      return { playerId: pid, name, goals, teamId: String(p?.info?.teamId ?? teamStr) };
    }).filter(x => x.playerId && x.teamId === teamStr && x.goals > 0);
    if (!rows.length) return [];
    rows.sort((a, b) => b.goals - a.goals);
    return rows.filter(x => x.goals === rows[0].goals);
  } catch { return []; }
}

/* ══════════════════════════════════════════════════════════
   SECTION HEADER — consistente con el resto de la app
══════════════════════════════════════════════════════════ */
function SecHeader({ title, actionLabel, onAction, colors }) {
  return (
    <View style={S.secHeader}>
      <View style={[S.secBar, { backgroundColor: BRAND.primary }]} />
      <Text style={[S.secTitle, { color: colors.text }]}>{title}</Text>
      {onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[S.secLink, { color: BRAND.primary }]}>{actionLabel || 'Ver más ›'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════
   TEAMSUMMARY
══════════════════════════════════════════════════════════ */
function TeamSummary({ teamId, scope, navigation, standings, onOpenPartidos, theme }) {
  const { colors } = theme;
  const isDark = theme.mode === 'dark';

  const [nextMatch,  setNextMatch]  = React.useState(null);
  const [lastMatch,  setLastMatch]  = React.useState(null);
  const [recentFive, setRecentFive] = React.useState([]);
  const [topScorers, setTopScorers] = React.useState([]);
  const [topRated,   setTopRated]   = React.useState([]);

  const teamIdNum = Array.isArray(teamId) ? Number(teamId[0]) : Number(teamId);

  /* ── Tabla de posiciones ── */
  const toNum      = v => { const n = parseInt(Array.isArray(v) ? v[0] : v, 10); return Number.isFinite(n) ? n : 0; };
  const toMaybeNum = v => { const raw = Array.isArray(v) ? v[0] : v; if (raw == null || raw === '') return undefined; const n = parseInt(raw, 10); return Number.isFinite(n) ? n : undefined; };
  const pickNum      = (row, keys) => { for (const k of keys) { if (row?.[k] != null) return toNum(row[k]); } return 0; };
  const pickMaybeNum = (row, keys) => { for (const k of keys) { if (row?.[k] != null) return toMaybeNum(row[k]); } return undefined; };
  const getTeamId    = row => String(row?.teamId ?? row?.id?.[0] ?? row?.team?.id ?? row?.team_id ?? row?.equipoId ?? '');
  const computePts   = row => { const f = pickMaybeNum(row, ['puntosactual','puntos','pts']); if (f != null) return f; return pickNum(row,['ganadosactual','ganados','g'])*3 + pickNum(row,['empatadosactual','empatados','e']); };

  const teamRow = React.useMemo(() => {
    if (!Array.isArray(standings) || !standings.length) return null;
    const idx = standings.findIndex(r => getTeamId(r) === String(teamId));
    if (idx === -1) return null;
    const src = standings[idx];
    return {
      position: idx + 1,
      points:   computePts(src),
      played:   pickNum(src, ['jugadosactual','jugados','j']),
      wins:     pickNum(src, ['ganadosactual','ganados','g']),
      draws:    pickNum(src, ['empatadosactual','empatados','e']),
      losses:   pickNum(src, ['perdidosactual','perdidos','p']),
      goalDiff: pickNum(src, ['difgolactual','diferencia','dif']),
      goalsFor:     pickMaybeNum(src, ['golesfavoractual','golesfavor','gf']),
      goalsAgainst: pickMaybeNum(src, ['golescontraactual','golescontra','gc']),
    };
  }, [standings, teamId]);

  const totalTeams = Array.isArray(standings) ? standings.length : 12;
  const pos = Number(teamRow?.position || 0);
  const scopeSafe = String(scope || 'guatemala').toLowerCase();
  const isConcacafFinal = scopeSafe === 'concacaf' && totalTeams === 4;

  let badgeBg = '#16a34a', badgeTxt = '#fff', badgeBorder = null;
  if (isConcacafFinal) {
    if (pos !== 1) { badgeBg = isDark ? '#2A2D3E' : '#F3F4F6'; badgeTxt = isDark ? '#fff' : '#111'; badgeBorder = isDark ? null : { borderWidth: 1, borderColor: '#E5E7EB' }; }
  } else if (totalTeams === 12) {
    if (pos > 10)      { badgeBg = '#DC2626'; badgeTxt = '#fff'; }
    else if (pos > 8)  { badgeBg = isDark ? '#2A2D3E' : '#F3F4F6'; badgeTxt = isDark ? '#fff' : '#111'; badgeBorder = isDark ? null : { borderWidth: 1, borderColor: '#E5E7EB' }; }
  } else {
    if (pos > totalTeams - 2)     { badgeBg = '#DC2626'; badgeTxt = '#fff'; }
    else if (pos > totalTeams - 4){ badgeBg = isDark ? '#2A2D3E' : '#F3F4F6'; badgeTxt = isDark ? '#fff' : '#111'; badgeBorder = isDark ? null : { borderWidth: 1, borderColor: '#E5E7EB' }; }
  }

  /* ── Carga de datos ── */
  React.useEffect(() => {
    let alive = true;
    (async () => {
      // 1. Agenda
      try {
        const evsObj = await fetchAgendaForTeam(teamId, scope);
        const keyedList = Array.isArray(evsObj)
          ? evsObj.map((row, idx) => ({ key: row?.channel || `k#${idx}`, row }))
          : Object.entries(evsObj || {}).map(([key, row]) => ({ key, row }));
        const matches = keyedList
          .map(({ key, row }, idx) => eventToMatch(key || `k#${idx}`, row, scope))
          .filter(Boolean)
          .sort((a, b) => {
            const ka = `${a._dateAdj}${a.scheduledStart}${String(a.matchId).padStart(9, '0')}`;
            const kb = `${b._dateAdj}${b.scheduledStart}${String(b.matchId).padStart(9, '0')}`;
            return ka.localeCompare(kb);
          });
        const future = matches.filter(m => FUTURE.has(Number(m.statusId)));
        const past   = matches.filter(m => !FUTURE.has(Number(m.statusId)));
        const next = future.length ? future[0] : null;
        const last = past.length   ? past[past.length - 1] : null;
        const pastFiveMatches = past.slice().reverse().slice(0, 5);
        const idsNeeded = pastFiveMatches.map(m => Number(m.matchId)).filter(Number.isFinite);
        const byId = {};
        const scan = Array.isArray(evsObj) ? evsObj : Object.values(evsObj || {});
        for (const raw of scan) {
          const id = Number(raw?.matchId ?? raw?.id ?? raw?.eventId);
          if (!Number.isFinite(id) || !idsNeeded.includes(id)) continue;
          const ov = {
            statusId: Number(raw?.statusId ?? raw?.status?.id),
            homeScore: Number(raw?.homeScore ?? raw?.scores?.home ?? raw?.result?.homeGoals),
            awayScore: Number(raw?.awayScore ?? raw?.scores?.away ?? raw?.result?.awayGoals),
            scheduledStart: raw?.scheduledStart ?? null, gmt: raw?.gmt ?? null,
          };
          if (Number.isFinite(ov.statusId) || Number.isFinite(ov.homeScore) || Number.isFinite(ov.awayScore)) byId[id] = ov;
        }
        const missing = idsNeeded.filter(id => byId[id] == null).slice(0, 5);
        if (missing.length) {
          const results = await Promise.all(missing.map(id => overlayFromEvent(id, scope).catch(() => ({}))));
          missing.forEach((id, i) => { if (results[i] && Object.keys(results[i]).length) byId[id] = results[i]; });
        }
        const enriched = pastFiveMatches.map(m => { const ov = byId[m.matchId]; return ov ? mergeOverlay(m, ov) : m; });
        const last5 = enriched.map(m => resultChipFor(m, teamId));
        if (alive) { setNextMatch(next); setLastMatch(last); setRecentFive(last5); }
      } catch {}

      // 2. Goleadores
      try { const tops = await fetchTopScorers(teamId, scope); if (alive) setTopScorers(tops); } catch {}

      // 3. Ratings
      try {
        const candidate = lastMatch?.matchId ?? nextMatch?.matchId;
        const lastId = Number(candidate);
        if (Number.isFinite(lastId)) {
          const resp = await fetch(`${BASE}/${scopeSafe}/events/${lastId}.json?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
          if (resp.ok) {
            const j = await resp.json();
            const toArray = x => Array.isArray(x) ? x : (x && typeof x === 'object' ? Object.entries(x).map(([pid, p]) => ({ pid, ...p })) : []);
            let rows = [];
            for (const src of [j?.players, j?.lineups?.players, j?.stats?.players]) { const arr = toArray(src); if (arr.length) { rows = arr; break; } }
            const teamIdStr = String(Array.isArray(teamId) ? teamId[0] : teamId);
            const norm = rows.map(p => ({
              playerId: Number(p?.playerId ?? p?.id ?? p?.pid ?? p?.personId),
              teamIdFromPlayer: String(p?.teamId ?? p?.team?.id ?? p?.equipoId ?? ''),
              name: p?.name?.shortName || p?.name?.nick || [p?.name?.first, p?.name?.last].filter(Boolean).join(' ') || '',
              rating: Number(p?.rating ?? p?.nota ?? p?.calificacion ?? p?.score ?? 0),
            })).filter(x => x.teamIdFromPlayer == teamIdStr && Number.isFinite(x.rating) && x.rating > 0)
              .sort((a, b) => b.rating - a.rating);
            if (alive) setTopRated(norm.slice(0, 3));
          }
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, [teamId, scope]);

  const cardBg  = colors.cardBg;
  const border  = colors.cardBorder;
  const mainScorer   = topScorers[0];
  const otherScorers = topScorers.slice(1);

  const TABLE_COLS = [
    { label: 'Pos',  value: teamRow?.position },
    { label: 'Pts',  value: teamRow?.points },
    { label: 'PJ',   value: teamRow?.played },
    { label: 'G',    value: teamRow?.wins },
    { label: 'E',    value: teamRow?.draws },
    { label: 'P',    value: teamRow?.losses },
    { label: 'GF',   value: teamRow?.goalsFor },
    { label: 'GC',   value: teamRow?.goalsAgainst },
    { label: 'Dif',  value: teamRow?.goalDiff },
  ];

  return (
    <View style={{ gap: 10 }}>

      {/* ══ PRÓXIMO PARTIDO ══ */}
      {nextMatch && (
        <View style={[S.card, { backgroundColor: cardBg, borderColor: border }]}>
          <SecHeader title="Próximo partido" colors={colors} />
          <Card
            match={nextMatch}
            showTourneyBadge={false}
            tourneyText=""
            onPress={() => {
              const idNum = Number(nextMatch?.matchId);
              if (!Number.isFinite(idNum) || idNum <= 0) return;
              navigation?.push?.('Match', {
                matchId: String(idNum),
                channel: nextMatch?.scope || scope || 'guatemala',
                pre: {
                  id: String(idNum),
                  teams: {
                    homeTeamId:   String(nextMatch?.teams?.homeTeamId ?? ''),
                    awayTeamId:   String(nextMatch?.teams?.awayTeamId ?? ''),
                    homeTeamName: nextMatch?.teams?.homeTeamName ?? '',
                    awayTeamName: nextMatch?.teams?.awayTeamName ?? '',
                  },
                  date: nextMatch?._dateAdj || nextMatch?.date || null,
                  scheduledStart: nextMatch?.scheduledStart ?? null,
                  gmt: nextMatch?.gmt ?? null,
                },
              });
            }}
          />
        </View>
      )}

      {/* ══ ÚLTIMOS PARTIDOS — chips de forma ══ */}
      {recentFive.length > 0 && (
        <View style={[S.card, { backgroundColor: cardBg, borderColor: border }]}>
          <SecHeader
            title="Últimos partidos"
            actionLabel="Ver todos ›"
            onAction={onOpenPartidos}
            colors={colors}
          />
          <View style={S.formRow}>
            {recentFive.map((g, idx) => {
              const bg = g.res === 'W' ? '#16a34a' : g.res === 'D' ? '#6B7280' : g.res === 'L' ? '#DC2626' : '#CBD5E1';
              return (
                <TouchableOpacity
                  key={`${g.matchId ?? 'm'}-${idx}`}
                  activeOpacity={0.75}
                  onPress={() => {
                    const idNum = Number(g?.matchId);
                    if (!Number.isFinite(idNum) || idNum <= 0) return;
                    navigation?.push?.('Match', { matchId: String(idNum), channel: String(scope || 'guatemala').toLowerCase() });
                  }}
                  style={S.formChip}
                >
                  {/* Badge W/D/L */}
                  <View style={[S.formBadge, { backgroundColor: bg }]}>
                    <Text style={S.formBadgeText}>{g.scoreStr}</Text>
                  </View>
                  {/* Logo rival */}
                  <LogoImg teamId={g.oppId} size={26} style={{ marginTop: 5 }} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ══ GOLEADOR PRINCIPAL ══ */}
      {mainScorer && (
        <View style={[S.card, { backgroundColor: cardBg, borderColor: border }]}>
          <SecHeader title="Goleador de la temporada" colors={colors} />
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Player', { playerId: Number(mainScorer.playerId), teamId: teamIdNum, scope })}
            style={S.scorerRow}
          >
            <Avatar id={mainScorer.playerId} size={56} rounded />
            <View style={{ flex: 1 }}>
              <Text style={[S.scorerName, { color: colors.text }]}>{mainScorer.name}</Text>
              <View style={S.scorerGoalsRow}>
                <Text style={[S.scorerGoalsNum, { color: BRAND.primary }]}>{mainScorer.goals}</Text>
                <Text style={[S.scorerGoalsLabel, { color: colors.textMuted }]}>goles</Text>
              </View>
            </View>
            <View style={[S.goalsBadge, { backgroundColor: isDark ? 'rgba(59,91,219,0.15)' : 'rgba(59,91,219,0.08)', borderColor: isDark ? 'rgba(59,91,219,0.3)' : 'rgba(59,91,219,0.15)' }]}>
              <Text style={[S.goalsBadgeNum, { color: BRAND.primary }]}>{mainScorer.goals}</Text>
            </View>
          </TouchableOpacity>

          {otherScorers.length > 0 && (
            <View style={[S.otherScorers, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={[S.otherScorersLabel, { color: colors.textMuted }]}>
                Comparten el liderato:
              </Text>
              <View style={S.otherScorersRow}>
                {otherScorers.map(s => (
                  <TouchableOpacity
                    key={s.playerId || s.name}
                    onPress={() => navigation.navigate('Player', { playerId: Number(s.playerId), teamId: teamIdNum, scope })}
                    style={[S.otherChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}
                  >
                    <Text style={[S.otherChipText, { color: colors.text }]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* ══ MEJORES DEL ÚLTIMO PARTIDO ══ */}
      {topRated.length > 0 && (
        <View style={[S.card, { backgroundColor: cardBg, borderColor: border }]}>
          <SecHeader title="Mejores del último partido" colors={colors} />
          <View style={{ gap: 4 }}>
            {topRated.map((p, i) => (
              <TouchableOpacity
                key={p.playerId}
                activeOpacity={0.75}
                onPress={() => navigation?.navigate?.('Player', { playerId: Number(p.playerId), teamId: teamIdNum, scope })}
                style={[S.ratedRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
              >
                <Text style={[S.ratedRank, { color: colors.textMuted }]}>{i + 1}</Text>
                <Avatar id={p.playerId} size={36} rounded />
                <Text style={[S.ratedName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
                <View style={[S.ratingPill, { backgroundColor: ratingBg(p.rating, isDark) }]}>
                  <Text style={[S.ratingText, { color: ratingColor(p.rating) }]}>
                    {Number(p.rating).toFixed(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ══ POSICIÓN EN LA TABLA ══ */}
      {teamRow && (
        <View style={[S.card, { backgroundColor: cardBg, borderColor: border }]}>
          <SecHeader title="Posición en la tabla" colors={colors} />
          {/* Header */}
          <View style={[S.tableHeader, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
            {TABLE_COLS.map(col => (
              <Text key={col.label} style={[S.tableHeadCell, { color: colors.textMuted }]}>{col.label}</Text>
            ))}
          </View>
          {/* Fila */}
          <View style={[S.tableRow, { backgroundColor: cardBg }]}>
            {TABLE_COLS.map((col, i) => (
              i === 0 ? (
                <View key={col.label} style={S.tableCell}>
                  <View style={[S.posBadge, { backgroundColor: badgeBg }, badgeBorder]}>
                    <Text style={[S.posBadgeText, { color: badgeTxt }]}>{String(col.value ?? '-')}</Text>
                  </View>
                </View>
              ) : (
                <Text key={col.label} style={[S.tableCell, S.tableCellText, { color: colors.text }]}>
                  {String(col.value ?? '-')}
                </Text>
              )
            ))}
          </View>
        </View>
      )}

    </View>
  );
}

/* ─── Rating helpers ─────────────────────────────────────── */
const ratingBg = (r, dark) =>
  r >= 8 ? (dark ? 'rgba(22,163,74,0.2)'  : 'rgba(22,163,74,0.1)')  :
  r >= 6 ? (dark ? 'rgba(59,91,219,0.2)'  : 'rgba(59,91,219,0.1)')  :
           (dark ? 'rgba(220,38,38,0.2)'   : 'rgba(220,38,38,0.1)');
const ratingColor = r => r >= 8 ? '#16a34a' : r >= 6 ? BRAND.primary : '#DC2626';

/* ─── Styles ─────────────────────────────────────────────── */
const S = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  /* Section header */
  secHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  secBar:    { width: 3, height: 16, borderRadius: 2 },
  secTitle:  { fontFamily: 'Poppins-SemiBold', fontSize: 13, flex: 1 },
  secLink:   { fontFamily: 'Poppins-Regular',  fontSize: 12 },

  /* Form chips */
  formRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  formChip: { alignItems: 'center', minWidth: 52 },
  formBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, minWidth: 44, alignItems: 'center' },
  formBadgeText: { fontFamily: 'Poppins-Bold', fontSize: 11, color: '#fff', lineHeight: 16 },

  /* Scorer */
  scorerRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scorerName:     { fontFamily: 'Poppins-SemiBold', fontSize: 14, marginBottom: 2 },
  scorerGoalsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scorerGoalsNum: { fontFamily: 'Poppins-Bold', fontSize: 22, lineHeight: 26 },
  scorerGoalsLabel:{ fontFamily: 'Poppins-Regular', fontSize: 12 },
  goalsBadge:     { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  goalsBadgeNum:  { fontFamily: 'Poppins-Bold', fontSize: 18 },

  otherScorers:   { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  otherScorersLabel: { fontFamily: 'Poppins-Regular', fontSize: 11, marginBottom: 6 },
  otherScorersRow:{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  otherChip:      { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 5 },
  otherChipText:  { fontFamily: 'Poppins-Regular', fontSize: 12 },

  /* Rated */
  ratedRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  ratedRank: { fontFamily: 'Poppins-Regular', fontSize: 12, width: 16, textAlign: 'center' },
  ratedName: { fontFamily: 'Poppins-Regular', fontSize: 13, flex: 1 },
  ratingPill:{ borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, minWidth: 44, alignItems: 'center' },
  ratingText:{ fontFamily: 'Poppins-Bold', fontSize: 13 },

  /* Table */
  tableHeader: { flexDirection: 'row', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 4, marginBottom: 2 },
  tableRow:    { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4 },
  tableHeadCell:{ flex: 1, textAlign: 'center', fontFamily: 'Poppins-Regular', fontSize: 11 },
  tableCell:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tableCellText:{ textAlign: 'center', fontFamily: 'Poppins-Bold', fontSize: 12 },
  posBadge:    { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  posBadgeText:{ fontFamily: 'Poppins-Bold', fontSize: 11, lineHeight: 16 },
});

export default withTheme(TeamSummary);