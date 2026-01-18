// utils/bell.js
// Centraliza assets y helpers de campana

// Ajusta estas rutas si tu carpeta real es /resources/
const BELL_ASSETS = {
  off: require('../resources/bell.png'),
  on: require('../resources/bell-on.png'),
  onWhite: require('../resources/bell-active-white.png'),
};

/**
 * Devuelve el source correcto según estado.
 * @param {{ on?: boolean, dark?: boolean }} opts
 */
export function getBellIcon(opts = {}) {
  const { on = false, dark = false } = opts;
  if (!on) return BELL_ASSETS.off;
  return dark ? BELL_ASSETS.onWhite : BELL_ASSETS.on;
}

/**
 * Label accesible (opcional)
 * @param {boolean} on
 */
export function bellA11yLabel(on) {
  return on ? 'Desactivar notificaciones' : 'Activar notificaciones';
}

export { BELL_ASSETS };
