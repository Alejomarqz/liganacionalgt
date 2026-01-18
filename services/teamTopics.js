// services/teamTopics.js
import messaging from "@react-native-firebase/messaging";

export async function followTeamTopic(teamId) {
  try {
    await messaging().requestPermission().catch(() => {});
    await messaging().registerDeviceForRemoteMessages().catch(() => {});
    await messaging().subscribeToTopic(`team_${String(teamId)}`);
  } catch {}
}

export async function unfollowTeamTopic(teamId) {
  try {
    await messaging().unsubscribeFromTopic(`team_${String(teamId)}`);
  } catch {}
}
