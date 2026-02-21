// services/followersApi.js
import messaging from '@react-native-firebase/messaging';
import { getIdToken } from './firebase';

const FOLLOW_URL   = 'https://follow-team-196740496415.us-central1.run.app';
const UNFOLLOW_URL = 'https://unfollow-team-196740496415.us-central1.run.app';

function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('FETCH_TIMEOUT')), ms)),
  ]);
}

export async function followTeamRequest(teamId, installId = null) {
  const token = await getIdToken();
  const res = await withTimeout(fetch(FOLLOW_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ teamId: String(teamId), installId }),
  }));

  let json = null;
  try { json = await res.json(); } catch {}
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `FOLLOW_FAILED_${res.status}`);
  }
  return json; // { ok:true, changed:true/false }
}

export async function unfollowTeamRequest(teamId) {
  const token = await getIdToken();
  const res = await withTimeout(fetch(UNFOLLOW_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ teamId: String(teamId) }),
  }));

  let json = null;
  try { json = await res.json(); } catch {}
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `UNFOLLOW_FAILED_${res.status}`);
  }
  return json;
}

export async function subscribeTeamTopic(teamId) {
  await messaging().requestPermission().catch(() => {});
  await messaging().registerDeviceForRemoteMessages().catch(() => {});
  await messaging().subscribeToTopic(`team_${teamId}`);
}

export async function unsubscribeTeamTopic(teamId) {
  await messaging().unsubscribeFromTopic(`team_${teamId}`);
}
