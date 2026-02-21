// utils/notifyFlags.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const get = async (k, d=false) => {
  try { const v = await AsyncStorage.getItem(k); return v === null ? d : v === "1"; }
  catch { return d; }
};
const set = async (k, val=true) => {
  try { await AsyncStorage.setItem(k, val ? "1" : "0"); } catch {}
};

export const hasShownNudge = () => get("notif_nudge_shown");
export const markNudgeShown = () => set("notif_nudge_shown");

export const hasSeenCoachMatch = () => get("coach_match_seen");
export const markCoachMatchSeen = () => set("coach_match_seen");

export const hasSeenCoachTeam = () => get("coach_team_seen");
export const markCoachTeamSeen = () => set("coach_team_seen");
