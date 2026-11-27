const express = require('express');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3007;
const API_KEY = process.env.API_KEY;

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use((req, res, next) => {
  if (req.path === '/health') return next();

  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  next();
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'liganacionalgt-push' });
});

function normalizeData(obj = {}) {
  const out = {};
  for (const k in obj) {
    if (obj[k] !== undefined && obj[k] !== null) {
      out[k] = String(obj[k]);
    }
  }
  return out;
}

function baseMessage({ notification, data }) {
  return {
    notification,
    data: normalizeData(data),
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          contentAvailable: true,
        },
      },
    },
  };
}

// GLOBAL
app.post('/push/global', async (req, res) => {
  try {
    const { title, body, data = {} } = req.body;

    const message = {
      topic: 'liganacionalgt',
      ...baseMessage({
        notification: {
          title: title || 'Liga Nacional GT',
          body: body || 'Notificación global',
        },
        data: {
          type: data.type || 'global',
          screen: data.screen || 'Home',
          ...data,
        },
      }),
    };

    const response = await admin.messaging().send(message);
    res.json({ ok: true, response });
  } catch (e) {
    console.error('[push/global]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// EQUIPO
app.post('/push/team', async (req, res) => {
  try {
    const { teamId, title, body, data = {} } = req.body;

    if (!teamId) {
      return res.status(400).json({ ok: false, error: 'teamId requerido' });
    }

    const message = {
      topic: `team_${String(teamId)}`,
      ...baseMessage({
        notification: {
          title: title || 'Liga Nacional GT',
          body: body || 'Notificación de equipo',
        },
        data: {
          type: data.type || 'team_update',
          screen: data.screen || 'Team',
          teamId: String(teamId),
          ...data,
        },
      }),
    };

    console.log('[push/team] enviando a topic:', message.topic);

    const response = await admin.messaging().send(message);
    res.json({ ok: true, topic: message.topic, response });
  } catch (e) {
    console.error('[push/team]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PARTIDO
app.post('/push/match', async (req, res) => {
  try {
    const { matchId, title, body, data = {} } = req.body;

    if (!matchId) {
      return res.status(400).json({ ok: false, error: 'matchId requerido' });
    }

    const message = {
      topic: `match_${String(matchId)}`,
      ...baseMessage({
        notification: {
          title: title || 'Liga Nacional GT',
          body: body || 'Notificación de partido',
        },
        data: {
          type: data.type || 'match_update',
          screen: data.screen || 'Match',
          matchId: String(matchId),
          ...data,
        },
      }),
    };

    console.log('[push/match] enviando a topic:', message.topic);

    const response = await admin.messaging().send(message);
    res.json({ ok: true, topic: message.topic, response });
  } catch (e) {
    console.error('[push/match]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// TOKEN DIRECTO
app.post('/push/token', async (req, res) => {
  try {
    const { token, title, body, data = {} } = req.body;

    if (!token) {
      return res.status(400).json({ ok: false, error: 'token requerido' });
    }

    const message = {
      token,
      ...baseMessage({
        notification: {
          title: title || 'Liga Nacional GT',
          body: body || 'Push directa',
        },
        data: {
          type: data.type || 'test',
          screen: data.screen || 'Home',
          ...data,
        },
      }),
    };

    const response = await admin.messaging().send(message);
    res.json({ ok: true, response });
  } catch (e) {
    console.error('[push/token]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// SUSCRIBIR TOKEN A TOPIC DESDE BACKEND
app.post('/push/subscribe-token-topic', async (req, res) => {
  try {
    const { token, topic } = req.body;

    if (!token || !topic) {
      return res.status(400).json({
        ok: false,
        error: 'token y topic requeridos',
      });
    }

    const cleanTopic = String(topic).trim();

    console.log('[subscribe-token-topic] token:', token);
    console.log('[subscribe-token-topic] topic:', cleanTopic);

    const response = await admin.messaging().subscribeToTopic(token, cleanTopic);

    res.json({
      ok: true,
      topic: cleanTopic,
      response,
    });
  } catch (e) {
    console.error('[subscribe-token-topic]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DESUSCRIBIR TOKEN DE TOPIC DESDE BACKEND
app.post('/push/unsubscribe-token-topic', async (req, res) => {
  try {
    const { token, topic } = req.body;

    if (!token || !topic) {
      return res.status(400).json({
        ok: false,
        error: 'token y topic requeridos',
      });
    }

    const cleanTopic = String(topic).trim();

    const response = await admin.messaging().unsubscribeFromTopic(token, cleanTopic);

    res.json({
      ok: true,
      topic: cleanTopic,
      response,
    });
  } catch (e) {
    console.error('[unsubscribe-token-topic]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log('🚀 Push server corriendo en puerto', PORT);
});