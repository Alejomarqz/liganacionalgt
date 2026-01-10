import { API_WEB_DEPORT_URL, FC_SCOPE_GUATEMALA } from '@env';

export const teamStatsUrl = (teamId, scope = FC_SCOPE_GUATEMALA) =>
  `${API_WEB_DEPORT_URL}/${scope}/statsCenter/teams/${teamId}.json`;
