// components/LineupsTeamBlock.js
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Pressable,
  InteractionManager,
} from "react-native";
import { API_WEB_DEPORT_URL } from "@env";
import Avatar, { RatingChip } from "./Avatar";
import { formatPitchLabel } from "../utils/formatPitchName";
import { formatSubName } from "../utils/formatNames";
import { changeName } from "../utils/changeName";
import { useTheme } from "../utils/ThemeContext";

import {
  CopilotProvider,
  CopilotStep,
  walkthroughable,
  useCopilot,
} from "react-native-copilot";

import { shouldShowGuide, markGuideDone } from "../utils/onboarding";
import CustomCopilotTooltip from "../utils/CustomCopilotTooltip";


/* ==== Constantes de layout ==== */
const PITCH_RATIO = 105 / 68; // FIFA ratio
const HALF_PITCH_FACTOR = 0.60; // altura de media cancha
const AVATAR_SIZE = 40;
const SPOT_WIDTH = 96;
const MIN_GK_DF_GAP = 0.030;
const GK_LABEL_LIFT_BOTTOM = 0.030;
const DEF_WING_LIFT_523 = 0.05;
const MID_WING_LIFT_352 = 0.05;
const DEF_WING_LIFT_532 = 0.05;
const DEF_WING_LIFT_541 = 0.05;
const MID_WING_LIFT_541 = 0.05;

// Desplazamiento vertical por formación
const BLOCK_SHIFT_UP_BY_FORMATION = {
  "4-2-3-1": 0.015,
};

const clamp01 = (v) => Math.max(0.02, Math.min(0.98, v));
const halfPitchHeight = (w) => Math.round(w * PITCH_RATIO * HALF_PITCH_FACTOR);

const WalkthroughableView = walkthroughable(View);
const WalkthroughablePressable = walkthroughable(Pressable);

/* =================================================================== */
/**
 * ✅ IMPORTANTE:
 * Este componente (LineupsTeamBlock) monta un CopilotProvider LOCAL.
 * Así, su tour NO se mezcla con los pasos del Match (MatchCard/tabs).
 */
export default function LineupsTeamBlock(props) {
  return (
    <CopilotProvider
      key={`lineups-copilot-${props?.matchId || props?.data?.match?.matchId || "x"}`}
      animated
      overlay="svg"
      tooltipComponent={CustomCopilotTooltip}
      labels={{
        previous: "Atrás",
        next: "Siguiente",
        skip: "Saltar",
        finish: "Entendido",
      }}
      arrowColor="transparent"
      backdropColor="rgba(0,0,0,0.22)"
      tooltipStyle={{
  backgroundColor: "transparent",
  padding: 0,
  width: "100%",
  alignItems: "center",
}}
verticalOffset={0}

    >
      <LineupsTeamBlockLocalCopilot {...props} />
    </CopilotProvider>
  );
}


/* =================================================================== */
/**
 * Esta versión usa useCopilot() del provider LOCAL, no el global del Match.
 */
function LineupsTeamBlockLocalCopilot({
  matchId = 784676,
  data,
  scope = "guatemala",
  navigation,
}) {
  const { theme } = useTheme();
  const UI = theme.colors;

  // ✅ copilot LOCAL
  const { start, copilotEvents } = useCopilot();

  const [state, setState] = useState({
    loading: !data,
    error: null,
    j: data || null,
  });
  const [active, setActive] = useState("home");

  // Tour control
  const guideStartedRef = useRef(false);
  const [tourEligible, setTourEligible] = useState(false);

  /* ===================== Fetch / load ===================== */
  useEffect(() => {
    let ignore = false;

    if (data && !ignore) {
      setState({ loading: false, error: null, j: data });
      return () => {
        ignore = true;
      };
    }

    (async () => {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const base = String(API_WEB_DEPORT_URL || "").replace(/\/+$/, "");
        const sc = String(scope || "guatemala").toLowerCase();
        const url = `${base}/${sc}/events/${matchId}.json?ts=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (!ignore) setState({ loading: false, error: null, j });
      } catch (e) {
        if (!ignore) setState({ loading: false, error: String(e), j: null });
      }
    })();

    return () => {
      ignore = true;
    };
  }, [matchId, data, scope]);

  /* ===================== Eligibility del tour ===================== */
  useEffect(() => {
    let mounted = true;
    let onStop = null;

    const run = async () => {
      try {
        const ok = await shouldShowGuide("guide_lineups_tap_player_v2");
        if (!mounted) return;

        if (!ok) {
          setTourEligible(false);
          return;
        }

        setTourEligible(true);

        onStop = async () => {
          await markGuideDone("guide_lineups_tap_player_v2");
          setTourEligible(false);
        };

        copilotEvents?.on?.("stop", onStop);
      } catch (e) {}
    };

    run();

    return () => {
      mounted = false;
      if (onStop) copilotEvents?.off?.("stop", onStop);
    };
  }, [copilotEvents]);

  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView message={state.error} />;

  const j = state.j || {};
  const ctxHome = buildTeamCtx(j, "home");
  const ctxAway = buildTeamCtx(j, "away");
  const ctx = active === "away" ? ctxAway : ctxHome;

  const noLineupHome = !(ctxHome.starters && ctxHome.starters.length);
  const noLineupAway = !(ctxAway.starters && ctxAway.starters.length);
  const noLineupActive = active === "home" ? noLineupHome : noLineupAway;
  const noLineupBoth = noLineupHome && noLineupAway;

  const showFormationPill = !noLineupActive && !!ctx.formationStr;

  const openPlayer = (pid, tid) => {
    const playerId = Number(pid);
    const teamId = Number(tid);
    if (!Number.isFinite(playerId) || !Number.isFinite(teamId)) return;
    navigation?.navigate?.("Player", { playerId, teamId, scope });
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: UI.cardBg,
          borderColor: UI.cardBorder,
          shadowColor: theme.name === "dark" ? "#000" : "#000",
        },
      ]}
    >
      {/* Switch centrado con nombres de equipos */}
      <View style={styles.toggleRow}>
        <View
          style={[
            styles.segment,
            { backgroundColor: UI.segmentBg, borderColor: UI.segmentBorder },
          ]}
        >
          <Pressable
            onPress={() => setActive("home")}
            style={[
              styles.segBtn,
              active === "home" && { backgroundColor: UI.accent },
            ]}
          >
            <Text
              style={[
                styles.segText,
                { color: UI.segmentText },
                active === "home" && { color: UI.segmentTextActive },
              ]}
              numberOfLines={1}
            >
              {ctxHome.teamName || "Local"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActive("away")}
            style={[
              styles.segBtn,
              active === "away" && { backgroundColor: UI.accent },
            ]}
          >
            <Text
              style={[
                styles.segText,
                { color: UI.segmentText },
                active === "away" && { color: UI.segmentTextActive },
              ]}
              numberOfLines={1}
            >
              {ctxAway.teamName || "Visitante"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Formación (pill) */}
      {showFormationPill && (
        <View style={styles.formRow}>
          <View
            style={[
              styles.formPill,
              { backgroundColor: UI.rowBgAlt, borderColor: UI.cardBorder },
            ]}
          >
            <Text style={[styles.formPillText, { color: UI.text }]}>
              {ctx.formationStr}
            </Text>
          </View>
        </View>
      )}

      {/* Contenido según disponibilidad */}
      {noLineupBoth ? (
        <EmptyLineups />
      ) : noLineupActive ? (
        <EmptyLineups />
      ) : (
        <>
          {/* Pitch */}
          <View style={styles.pitchBleed}>
            <PitchWithMatchBg
              starters={ctx.starters}
              side={ctx.side}
              formationStr={ctx.formationStr}
              formation={ctx.formation}
              onPressPlayer={openPlayer}
              tour={{
                start,
                eligible: tourEligible,
                startedRef: guideStartedRef,
              }}
            />
          </View>

          {/* DT */}
          {ctx.coach ? <CoachRow coach={ctx.coach} /> : null}

          {/* Suplentes */}
          <SectionHeader title="Suplentes" />
          <SubsList data={ctx.subs} onPressPlayer={openPlayer} />
        </>
      )}
    </View>
  );
}

/* ================== helpers de contexto ================== */
function buildTeamCtx(j, key) {
  const m = j?.match || {};
  const all = j?.players || {};
  const isAway = key === "away";
  const teamId = String(isAway ? m.awayTeamId : m.homeTeamId || "");
  const teamName = changeName(isAway ? m.awayTeamName : m.homeTeamName);

  const starters = pickStarters(all, teamId);
  const { subs, coach } = getSubsAndCoach(all, teamId);

  const defC = starters.filter((p) => p.posnId === 2).length;
  const midC = starters.filter((p) => p.posnId === 3).length;
  const fwdC = starters.filter((p) => p.posnId === 4).length;
  const formationStr = inferFormationFromCounts(defC, midC, fwdC);
  const formation = parseFormation(formationStr);

  const flip = isAway,
    side = flip ? "bottom" : "top";
  return { teamId, teamName, starters, subs, coach, formationStr, formation, flip, side };
}

/* ================== pitch (fondo + layout) ================== */

function HalfPitchGreen({ width, side = "top" }) {
  const h = halfPitchHeight(width);
  const stripeH = h / 10;
  const isTop = side === "top";
  const R = (9.15 / 52.5) * h;

  return (
    <View style={{ width, height: h }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: i * stripeH,
            height: stripeH,
            backgroundColor: i % 2 ? "#277947" : "#2f8d4e",
          }}
        />
      ))}
      <View style={[pitchStyles.perimeter, { width, height: h }]} />
      <View style={[pitchStyles.hLine, { top: isTop ? h - 2 : 0, width }]} />

      {isTop ? (
        <>
          <View style={[pitchStyles.goal, { top: -2, left: width * 0.4, width: width * 0.2 }]} />
          <View style={[pitchStyles.box, { top: 0, left: width * 0.10, width: width * 0.80, height: h * 0.36 }]} />
          <View style={[pitchStyles.box, { top: 0, left: width * 0.32, width: width * 0.36, height: h * 0.12 }]} />
        </>
      ) : (
        <>
          <View style={[pitchStyles.goal, { bottom: -2, left: width * 0.4, width: width * 0.2 }]} />
          <View style={[pitchStyles.box, { bottom: 0, left: width * 0.10, width: width * 0.80, height: h * 0.36 }]} />
          <View style={[pitchStyles.box, { bottom: 0, left: width * 0.32, width: width * 0.36, height: h * 0.12 }]} />
        </>
      )}

      <View
        style={[
          pitchStyles.centerArc,
          {
            left: width / 2 - R,
            width: R * 2,
            height: R * 2,
            borderRadius: R,
            top: isTop ? h - R : -R,
          },
        ]}
      />
    </View>
  );
}

const pitchStyles = StyleSheet.create({
  perimeter: { position: "absolute", left: 0, top: 0, borderWidth: 2, borderColor: "#fff" },
  hLine: { position: "absolute", left: 0, right: 0, height: 2, backgroundColor: "#fff" },
  goal: { position: "absolute", height: 3, backgroundColor: "#fff" },
  box: { position: "absolute", borderWidth: 2, borderColor: "#fff", backgroundColor: "transparent" },
  centerArc: { position: "absolute", borderWidth: 2, borderColor: "#fff", backgroundColor: "transparent" },
});

/* --- presets y helpers de distribución --- */
const FORMATION_PRESETS = {
  "4-2-3-1": { top: { gk: 0.09, lines: [0.30, 0.50, 0.69, 0.88], pads: [0.10, 0.18, 0.20, 0.18] } },
  "4-4-2": { top: { gk: 0.09, lines: [0.34, 0.60, 0.85], pads: [0.16, 0.18, 0.62] } },
  "3-5-2": { top: { gk: 0.09, lines: [0.29, 0.55, 0.85], pads: [0.16, 0.12, 0.62] } },
  "3-4-3": { top: { gk: 0.09, lines: [0.33, 0.58, 0.85], pads: [0.20, 0.12, 0.18] } },
  "4-3-3": { top: { gk: 0.09, lines: [0.33, 0.60, 0.85], pads: [0.13, 0.30, 0.18] } },
  "5-2-3": { top: { gk: 0.09, lines: [0.31, 0.60, 0.85], pads: [0.10, 0.19, 0.18] } },
  "5-3-2": { top: { gk: 0.09, lines: [0.31, 0.60, 0.85], pads: [0.10, 0.25, 0.62] } },
  "3-6-1": { top: { gk: 0.09, lines: [0.33, 0.60, 0.88], pads: [0.20, 0.08, 0.22] } },
  "2-6-2": { top: { gk: 0.09, lines: [0.33, 0.48, 0.84], pads: [0.85, 0.08, 0.62] } },
  "5-4-1": { top: { gk: 0.09, lines: [0.33, 0.63, 0.87], pads: [0.10, 0.09, 0.42] } },
  "6-2-2": { top: { gk: 0.09, lines: [0.33, 0.63, 0.87], pads: [0.90, 0.09, 0.62] } },
};

function getPreset(formationStr, nNonGkLines) {
  const p = FORMATION_PRESETS[formationStr];
  if (p?.top) return p.top;
  const L = Math.max(1, nNonGkLines | 0);
  const gk = 0.11, first = 0.30, last = 0.87;
  const step = (last - first) / Math.max(1, L - 1);
  const lines = Array.from({ length: L }, (_, i) => first + i * step);
  const pads = lines.map((_, i) => (i === 0 ? 0.16 : i === L - 1 ? 0.18 : 0.20));
  return { gk, lines, pads };
}

function getLineXs(n, pad = 0.18) {
  if (n <= 0) return [];
  if (n === 1) return [0.5];
  const span = Math.max(0.12, 1 - Math.min(0.9, Math.max(0, pad)));
  const left = (1 - span) / 2;
  const step = span / n;
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(left + (i + 0.5) * step);
  return xs;
}

function PitchWithMatchBg({ starters, side, formationStr, formation, onPressPlayer, tour }) {
  const byOrder = (a, b) => {
    const oa = Number(a.order) || 0, ob = Number(b.order) || 0;
    if (oa !== ob) return oa - ob;
    const na = Number(a.number) || 999, nb = Number(b.number) || 999;
    return na - nb;
  };

  const gk = starters.filter((p) => p.posnId === 1).sort(byOrder);
  const def = starters.filter((p) => p.posnId === 2).sort(byOrder);
  const mid = starters.filter((p) => p.posnId === 3).sort(byOrder);
  const fwd = starters.filter((p) => p.posnId === 4).sort(byOrder);

  const rowsLogical = [gk, def];
  if (formation?.midLines?.length) {
    let idx = 0;
    formation.midLines.forEach((cnt) => {
      const slice = mid.slice(idx, idx + Math.max(0, cnt | 0));
      idx += Math.max(0, cnt | 0);
      rowsLogical.push(slice.length ? slice : []);
    });
    if (idx < mid.length) {
      const last = rowsLogical.length - 1;
      if (last >= 0) rowsLogical[last] = (rowsLogical[last] || []).concat(mid.slice(idx));
    }
  } else if (mid.length) {
    rowsLogical.push(mid);
  }
  if (fwd.length) rowsLogical.push(fwd);

  const [w, setW] = useState(0);
  const [firstStepReady, setFirstStepReady] = useState(false);

  useEffect(() => {
    setFirstStepReady(false);
  }, [side, formationStr, w]);

  const h = w ? halfPitchHeight(w) : 0;
  const preset = getPreset(formationStr, rowsLogical.length - 1);
  const isTop = side === "top";

  const f = String(formationStr || "").replace(/\s+/g, "");
  const shiftUp = BLOCK_SHIFT_UP_BY_FORMATION[formationStr] || 0;
  const applyBlockShift = (y) => clamp01(y + (isTop ? -shiftUp : +shiftUp));

  const placed = React.useMemo(() => {
    if (!w || !h) return [];

    let gkY = preset.gk;
    const dfY0 = preset.lines[0] ?? 0.30;
    if (dfY0 - gkY < MIN_GK_DF_GAP) gkY = Math.max(0.02, dfY0 - MIN_GK_DF_GAP);

    gkY = applyBlockShift(gkY);

    if (!isTop) gkY = clamp01(gkY + GK_LABEL_LIFT_BOTTOM);
    if (dfY0 - gkY < MIN_GK_DF_GAP) gkY = clamp01(dfY0 - MIN_GK_DF_GAP);

    const out = [];
    if (rowsLogical[0]?.length) {
      const xs = getLineXs(rowsLogical[0].length, 0.5);
      rowsLogical[0].forEach((p, i) => out.push({ ...p, x: xs[i] ?? 0.5, y: gkY }));
    }

    for (let li = 1; li < rowsLogical.length; li++) {
      const line = rowsLogical[li] || [];
      if (!line.length) continue;

      const yBaseRaw = preset.lines[li - 1] ?? 0.25 + li * 0.15;
      const yBase = applyBlockShift(yBaseRaw);

      const pad = preset.pads[li - 1] ?? 0.18;
      const xs = getLineXs(line.length, pad);

      line.forEach((p, i) => {
        const lastIdx = line.length - 1;
        let y = yBase;

        if (li === 1 && line.length >= 5 && (i === 0 || i === lastIdx)) {
          if (f === "5-2-3") y = clamp01(y + DEF_WING_LIFT_523);
          if (f === "5-3-2") y = clamp01(y + DEF_WING_LIFT_532);
          if (f === "5-4-1") y = clamp01(y + DEF_WING_LIFT_541);
        }

        if (li === 2 && (i === 0 || i === lastIdx)) {
          if (f === "3-5-2" && line.length >= 5) y = clamp01(y + MID_WING_LIFT_352);
          if (f === "5-4-1" && line.length >= 4) y = clamp01(y + MID_WING_LIFT_541);
        }

        out.push({ ...p, x: xs[i] ?? 0.5, y });
      });
    }

    return out.map((pl) => ({
      ...pl,
      left: Math.round(pl.x * w) - Math.round(SPOT_WIDTH / 2),
      top: Math.round((isTop ? pl.y : 1 - pl.y) * h) - Math.round(AVATAR_SIZE / 2),
    }));
  }, [w, h, isTop, rowsLogical, preset, shiftUp, f]);

  /**
   * ✅ Arrancar tour LOCAL:
   * - SOLO si eligible
   * - SOLO una vez
   * - SOLO cuando ya existe el walkthroughable (firstStepReady)
   */
  useEffect(() => {
    if (!tour?.start) return;
    if (!tour?.eligible) return;
    if (tour?.startedRef?.current) return;
    if (!w || !h) return;
    if (!placed?.length) return;
    if (!firstStepReady) return;

    tour.startedRef.current = true;

    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        const t = setTimeout(() => {
          tour.start();
        }, 150);
        tour.__t = t;
      });
    });

    return () => {
      try {
        task?.cancel?.();
      } catch (e) {}
      try {
        clearTimeout(tour.__t);
      } catch (e) {}
    };
  }, [tour?.start, tour?.eligible, w, h, placed?.length, firstStepReady]);

  return (
    <View
      style={styles.pitch}
      onLayout={(e) => {
        const newW = Math.round(e.nativeEvent.layout.width || 0);
        if (newW && newW !== w) setW(newW);
      }}
    >
      {w > 0 && <HalfPitchGreen width={w} side={side} />}

      {h > 0 && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: "space-between", paddingTop: 8, paddingBottom: 14 },
          ]}
        >
          {placed.map((p, idx) => {
            // solo el primer jugador lleva step
            if (idx !== 0 || !tour?.eligible) {
              return (
                <Spot
        key={`spot-${p.teamId}-${p.id}-${idx}`}
        p={p}
        onPress={() => onPressPlayer?.(p.id, p.teamId)}
      />

              );
            }

            return (
  <CopilotStep
  key={`tour-${p.teamId}-${p.id}-${idx}`}
  name="lineups-first-player"
  order={1}
  text="Toca la foto del jugador para ver sus detalles."
  placement="bottom"
  tooltipPlacement="bottom"
>


    {/* 🔑 WRAPPER ANCHO COMPLETO */}
    <WalkthroughableView
      collapsable={false}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: p.top - 10, // pequeño lift
        height: AVATAR_SIZE + 40,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onLayout={() => {
        if (!firstStepReady) setFirstStepReady(true);
      }}
    >
      <Pressable
        onPress={() => onPressPlayer?.(p.id, p.teamId)}
        style={{
          width: SPOT_WIDTH,
          alignItems: 'center',
        }}
        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
      >
        <Avatar
          id={p.id}
          size={AVATAR_SIZE}
          overlayRating={p.rating}
          overlayOffset={8}
        />
        <Text numberOfLines={1} style={[styles.pitchLabel, { maxWidth: SPOT_WIDTH }]}>
          {formatPitchLabel(p.nameObj, p.number)}
        </Text>
      </Pressable>
    </WalkthroughableView>
  </CopilotStep>
);

          })}
        </View>
      )}
    </View>
  );
}

function Spot({ p, onPress }) {
  const label = formatPitchLabel(p.nameObj, p.number);
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: "absolute",
        left: p.left,
        top: p.top,
        width: SPOT_WIDTH,
        alignItems: "center",
      }}
      android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}
    >
      <Avatar id={p.id} size={AVATAR_SIZE} overlayRating={p.rating} overlayOffset={8} />
      <Text numberOfLines={1} style={[styles.pitchLabel, { maxWidth: SPOT_WIDTH }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ================== DT + suplentes ================== */

function CoachRow({ coach }) {
  const { theme } = useTheme();
  const UI = theme.colors;
  const name = nameFull(coach.nameObj);

  return (
    <View style={[styles.coachRow, { borderTopColor: UI.cardBorder, backgroundColor: UI.rowBgAlt }]}>
      <Avatar id={coach.id} size={38} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text numberOfLines={1} style={[styles.coachName, { color: UI.text }]}>
          {name}
        </Text>
      </View>
      <Text style={[styles.posCode, { color: UI.textMuted }]}>DT</Text>
    </View>
  );
}

function SectionHeader({ title = "Suplentes" }) {
  const { theme } = useTheme();
  const UI = theme.colors;

  return (
    <View style={[styles.subHeader, styles.subHeaderBleed, { backgroundColor: UI.rowBgAlt, borderColor: UI.cardBorder }]}>
      <Text style={[styles.subHeaderText, { color: UI.text }]}>{title}</Text>
    </View>
  );
}

function SubsList({ data, onPressPlayer }) {
  const { theme } = useTheme();
  const UI = theme.colors;

  if (!data?.length) {
    return <Text style={{ fontStyle: "italic", color: UI.textMuted }}>Sin suplentes</Text>;
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(it, idx) => `${it.id}-${idx}`}
      renderItem={({ item }) => (
        <SubRow item={item} onPress={() => onPressPlayer?.(item.id, item.teamId)} />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      scrollEnabled={false}
    />
  );
}

function SubRow({ item, onPress }) {
  const { theme } = useTheme();
  const UI = theme.colors;

  const name = formatSubName(item.nameObj);
  const hasNumber = item.number != null && item.number !== "";

  return (
    <Pressable onPress={onPress} style={[styles.subRow, { backgroundColor: UI.rowBgAlt }]}>
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        <Avatar id={item.id} size={38} />
        {hasNumber ? (
          <View style={[styles.numberPill, { backgroundColor: UI.chipNumberBg, borderColor: UI.chipNumberBorder }]}>
            <Text style={[styles.numberPillText, { color: UI.text }]}>{item.number}</Text>
          </View>
        ) : null}
        <Text numberOfLines={1} style={[styles.subName, { color: UI.text }]}>
          {name}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <RatingChip value={item.rating} />
        <Text style={[styles.posCode, { color: UI.textMuted }]}>{item.pos}</Text>
      </View>
    </Pressable>
  );
}

/* ================== datos (players) ================== */

function pickStarters(playersObj, teamId) {
  const rows = Object.entries(playersObj).map(([pid, p]) => ({ pid, ...p }));
  return rows
    .filter((p) => String(p.teamId) === String(teamId))
    .filter((p) => !isSub(p.substitute))
    .filter((p) => [1, 2, 3, 4].includes(Number(p.posnId)))
    .sort((a, b) => {
      const ra = Number(a.posnId) || 99,
        rb = Number(b.posnId) || 99;
      if (ra !== rb) return ra - rb;
      return (Number(a.order) || 0) - (Number(b.order) || 0);
    })
    .map((p) => ({
      id: String(p.pid),
      teamId: String(p.teamId),
      number: p.squadNo,
      nameObj: p.name || {},
      rating: toRating(p.rating),
      posnId: Number(p.posnId) || 0,
      order: Number(p.order) || 0,
    }));
}

function getSubsAndCoach(playersObj, teamId) {
  const rows = Object.entries(playersObj).map(([pid, p]) => ({ pid, ...p }));
  const teamRows = rows.filter((p) => String(p.teamId) === String(teamId));

  const subs = teamRows
    .filter((p) => [1, 2, 3, 4].includes(Number(p.posnId)) && isSub(p.substitute))
    .map((p) => ({
      id: String(p.pid),
      teamId: String(p.teamId),
      number: p.squadNo,
      nameObj: p.name || {},
      rating: toRating(p.rating),
      pos: posCode(p.posnId),
      order: Number(p.order) || 999,
    }))
    .sort((a, b) => {
      const rank = { PO: 1, DEF: 2, MED: 3, DEL: 4 };
      const A = rank[a.pos] || 99,
        B = rank[b.pos] || 99;
      if (A !== B) return A - B;
      const an = Number(a.number) || 999,
        bn = Number(b.number) || 999;
      if (an !== bn) return an - bn;
      return a.order - b.order;
    });

  const coach =
    teamRows
      .filter((p) => Number(p.posnId) === 5)
      .slice(0, 1)
      .map((p) => ({ id: String(p.pid), nameObj: p.name || {} }))[0] || null;

  return { subs, coach };
}

function isSub(v) {
  return v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";
}
function toRating(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function posCode(id) {
  const n = Number(id);
  if (n === 1) return "PO";
  if (n === 2) return "DEF";
  if (n === 3) return "MED";
  if (n === 4) return "DEL";
  if (n === 5) return "DT";
  return "";
}
function nameFull(name = {}) {
  const a = [name.first, name.last].filter(Boolean).join(" ").trim();
  return a || (name.shortName || name.nick || "").trim();
}

function inferFormationFromCounts(d, m, f) {
  if (d === 4 && m === 5 && f === 1) return "4-2-3-1";
  if (d === 4 && m === 4 && f === 2) return "4-4-2";
  if (d === 4 && m === 3 && f === 3) return "4-3-3";
  if (d === 3 && m === 5 && f === 2) return "3-5-2";
  if (d === 3 && m === 4 && f === 3) return "3-4-3";
  if (d === 5 && m === 3 && f === 2) return "5-3-2";
  if (d === 5 && m === 4 && f === 1) return "5-4-1";
  if (d === 3 && m === 6 && f === 1) return "3-6-1";
  if (d === 2 && m === 6 && f === 2) return "2-6-2";
  if (d === 6 && m === 2 && f === 2) return "6-2-2";
  return `${d || 0}-${m || 0}-${f || 0}`;
}

function parseFormation(str) {
  if (!str) return { def: 0, midLines: [], fwd: 0 };
  const nums = String(str)
    .split("-")
    .map((n) => Math.max(0, parseInt(n, 10) || 0))
    .filter(Boolean);
  if (!nums.length) return { def: 0, midLines: [], fwd: 0 };
  const def = nums[0] || 0,
    fwd = nums.length > 1 ? nums[nums.length - 1] : 0;
  let midLines = [];
  if (nums.length >= 3) midLines = nums.slice(1, -1);
  else if (nums.length === 2) midLines = [nums[1]];
  return { def, midLines, fwd };
}

/* ================== UI básicos ================== */
function Loading() {
  const { theme } = useTheme();
  const UI = theme.colors;
  return (
    <View style={{ padding: 16, alignItems: "center" }}>
      <ActivityIndicator color={UI.accent} />
      <Text style={{ marginTop: 8, color: UI.textMuted }}>Cargando…</Text>
    </View>
  );
}
function ErrorView({ message }) {
  const { theme } = useTheme();
  const UI = theme.colors;
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ color: UI.accent, fontWeight: "700" }}>Error</Text>
      <Text style={{ marginTop: 6, color: UI.text }}>{message}</Text>
    </View>
  );
}

/* === Aviso cuando no hay alineaciones === */
function EmptyLineups() {
  const { theme } = useTheme();
  const UI = theme.colors;
  return (
    <View style={[styles.emptyBox, { backgroundColor: UI.rowBgAlt, borderColor: UI.cardBorder }]}>
      <Text style={[styles.emptyTitle, { color: UI.text }]}>
        Alineaciones no disponibles por ahora
      </Text>
      <Text style={[styles.emptyText, { color: UI.textMuted }]}>
        Se publicarán minutos antes del inicio. Desliza hacia abajo para actualizar.
      </Text>
    </View>
  );
}

/* ================== estilos base ================== */
const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 0,
    marginBottom: 12,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },

  toggleRow: { alignItems: "center", marginBottom: 6 },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 18, padding: 2, alignSelf: "center" },
  segBtn: { minWidth: 120, height: 25, paddingHorizontal: 10, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  segText: { fontSize: 12, fontWeight: "700" },

  formRow: { marginBottom: 8, alignSelf: "stretch", flexDirection: "row", justifyContent: "flex-end" },
  formPill: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  formPillText: { fontSize: 12, fontWeight: "800" },

  pitchBleed: { marginHorizontal: -12 },
  pitch: { borderRadius: 10, overflow: "hidden", backgroundColor: "transparent" },

  pitchLabel: {
    fontSize: 10,
    marginTop: 6,
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1.5,
  },

  coachRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  coachName: { fontSize: 12, fontWeight: "900" },

  posCode: { width: 34, textAlign: "right", fontWeight: "700" },
  subRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderRadius: 8 },
  separator: { height: 8 },

  subHeader: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: 30,
    borderRadius: 6,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  subHeaderBleed: { marginTop: 8, marginBottom: 6, marginHorizontal: -12 },
  subHeaderText: { fontSize: 13, fontWeight: "900" },

  numberPill: {
    marginLeft: 10,
    marginRight: 8,
    minWidth: 30,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  numberPillText: { fontWeight: "700", fontSize: 12 },
  subName: { fontSize: 12, flexShrink: 1, fontWeight: "900" },

  emptyBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 6,
  },
  emptyTitle: { fontSize: 13, fontWeight: "900", marginBottom: 6, textAlign: "center" },
  emptyText: { fontSize: 12, fontWeight: "600", textAlign: "center" },
});
