// utils/streakHelper.js
const FC_BASE = 'https://futbolchapin.net/html/v3/htmlCenter/data/deportes/futbol/guatemala';
const STREAK_COUNT = 3;

async function fetchMatchScore(matchId) {
  try {
    const res  = await fetch(`${FC_BASE}/events/${matchId}.json`);
    const json = await res.json();
    const ss = json?.scoreStatus;
    if (!ss) return null;
    const entries = Object.entries(ss);
    if (entries.length < 2) return null;
    const homeId = String(json?.match?.homeTeamId ?? entries[0][0]);
    const awayId = String(json?.match?.awayTeamId ?? entries[1][0]);
    const homeG  = entries.find(([k]) => k === homeId)?.[1]?.score ?? 0;
    const awayG  = entries.find(([k]) => k === awayId)?.[1]?.score ?? 0;
    return { homeId, awayId, homeG, awayG };
  } catch {
    return null;
  }
}

export async function buildStreakMap(teamIds = []) {
  const map = {};
  try {
    const res  = await fetch(`${FC_BASE}/agendaMaM/es/agenda.json`);
    const json = await res.json();
    const eventsObj = json?.events ?? {};

    const allEvents = Object.entries(eventsObj).map(([key, ev]) => ({
      matchId: parseInt(key.split('.').pop(), 10),
      homeTeamId: String(ev?.teams?.homeTeamId ?? ''),
      awayTeamId: String(ev?.teams?.awayTeamId ?? ''),
      statusId: ev?.statusId,
      date: ev?.date ?? 0,
    }));

    const finished = allEvents
      .filter(e => e.statusId === 2)
      .sort((a, b) => b.date - a.date);

    const ids = teamIds.map(id => String(id)).filter(Boolean);

    await Promise.all(ids.map(async (tid) => {
      const teamMatches = finished
        .filter(e => e.homeTeamId === tid || e.awayTeamId === tid)
        .slice(0, STREAK_COUNT);

      const scores = await Promise.all(
        teamMatches.map(m => fetchMatchScore(m.matchId))
      );

      const results = [];
      for (let i = 0; i < teamMatches.length; i++) {
        const sc = scores[i];
        if (!sc) continue;
        const isHome = sc.homeId === tid;
        const myG    = isHome ? sc.homeG : sc.awayG;
        const theirG = isHome ? sc.awayG : sc.homeG;
        if (myG > theirG)      results.push('W');
        else if (myG < theirG) results.push('L');
        else                   results.push('D');
      }
      map[tid] = results;
    }));
  } catch (e) {
    console.warn('[Racha] buildStreakMap error:', e.message);
  }
  return map;
}