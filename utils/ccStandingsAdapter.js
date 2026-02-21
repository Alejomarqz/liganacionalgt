// ccStandingsAdapter.js
export async function getCCGroupRows(teamId, srcUrl=null) {
  const base = 'https://futbolchapin.net/edit/concacaf-standings.php';
  const url  = srcUrl ? `${base}?src=${encodeURIComponent(srcUrl)}&t=${Date.now()}` 
                      : `${base}?t=${Date.now()}`;

  const res = await fetch(url);
  const { groups, teamGroup } = await res.json();

  const groupName = teamGroup?.[String(teamId)] || Object.keys(groups || {})[0];
  const rows = (groups?.[groupName] || []);
  return { groupName, rows };
}

// Convierte al formato que ya usa PositionsBlock (tipo DataFactory)
export function toPositionsBlock(rows=[]) {
  return rows.map((r, i) => ({
    equipo: [r.team],
    equipoid: [String(r.teamId)],
    puntosactual: [String(r.pts)],
    jugadosactual:[String(r.pj)],
    ganadosactual:[String(r.pg)],
    empatadosactual:[String(r.pe)],
    perdidosactual:[String(r.pp)],
    golesfavoractual:[String(r.gf)],
    golescontraactual:[String(r.gc)],
    difgolactual:[String(r.df)],
    posicionactual:[String(i+1)],
  }));
}
