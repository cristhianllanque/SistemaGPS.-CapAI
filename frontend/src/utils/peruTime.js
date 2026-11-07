/**
 * Utilidades centralizadas de Zona Horaria Oficial del Perú (America/Lima, UTC-05:00).
 * Perú no utiliza horario de verano (DST), por lo que permanece en UTC-05:00 todo el año.
 *
 * El backend y los equipos Teltonika almacenan las marcas de tiempo en UTC (UTC+0).
 * Este módulo garantiza que:
 *  1. Toda marca de tiempo recibida del servidor (con o sin sufijo 'Z') se interprete como UTC real.
 *  2. Toda hora y fecha mostrada en Web, iPhone (PWA) y Android (APK) se formatee en America/Lima.
 *  3. Todo filtro de fecha/hora (Historial de Rutas, Reportes) interprete la entrada como Hora Perú
 *     y cubra hasta el segundo :59.999 del minuto final seleccionado.
 */

export const PERU_TIMEZONE = 'America/Lima';

/**
 * Convierte cualquier timestamp proveniente del backend/WebSocket a un objeto Date válido en UTC.
 * Si el string ISO no trae zona horaria ('Z' o '+/-HH:MM'), se asume UTC ('Z') para evitar desfases de +5h.
 */
export function parseServerUTC(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    let s = val.trim();
    if (!s) return null;
    if (s.includes(' ') && !s.includes('T')) {
      s = s.replace(' ', 'T');
    }
    const hasExplicitTZ = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
    const normalized = hasExplicitTZ ? s : `${s}Z`;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Extrae las partes numéricas (año, mes, día, hora 00-23, minuto, segundo) en Hora Perú.
 */
export function getPeruDateParts(val = new Date()) {
  const d = parseServerUTC(val) || new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PERU_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(d);

  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = p.value;
    }
  }
  if (map.hour === '24') map.hour = '00';
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second
  };
}

/**
 * Formatea solo la hora en Hora Oficial de Perú (ej. "11:25:08 a. m." o "11:25 a. m.").
 */
export function formatPeruTime(val, includeSeconds = true) {
  const d = parseServerUTC(val);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: PERU_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    hour12: true
  }).format(d);
}

/**
 * Formatea solo la fecha en Hora Oficial de Perú (ej. "07/11/2026").
 */
export function formatPeruDate(val) {
  const d = parseServerUTC(val);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: PERU_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}

/**
 * Formatea fecha y hora en Hora Oficial de Perú (ej. "07/11/2026, 11:25 a. m.").
 */
export function formatPeruDateTime(val, includeSeconds = false) {
  const d = parseServerUTC(val);
  if (!d) return '—';
  return `${formatPeruDate(d)} ${formatPeruTime(d, includeSeconds)}`;
}

/**
 * Devuelve un string 'YYYY-MM-DDTHH:mm' en Hora Perú para usar en <input type="datetime-local" />.
 */
export function toPeruInputValue(date = new Date()) {
  const { year, month, day, hour, minute } = getPeruDateParts(date);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Devuelve un sello compacto 'YYYYMMDD_HHmm' en Hora Perú para nombres de archivos exportados.
 */
export function getPeruFileStamp(date = new Date()) {
  const { year, month, day, hour, minute } = getPeruDateParts(date);
  return `${year}${month}${day}_${hour}${minute}`;
}

/**
 * Calcula rangos predefinidos ('hoy', 'ayer', '24h', '7d', 'mes') estrictamente en Hora Perú.
 */
export function getPeruPresetRange(type = 'hoy') {
  const now = new Date();
  const { year, month, day } = getPeruDateParts(now);

  if (type === 'hoy') {
    return {
      inicio: `${year}-${month}-${day}T00:00`,
      fin: `${year}-${month}-${day}T23:59`
    };
  }

  if (type === 'ayer') {
    const noonPeru = new Date(`${year}-${month}-${day}T12:00:00-05:00`);
    const yesterdayPeru = new Date(noonPeru.getTime() - 24 * 60 * 60 * 1000);
    const yParts = getPeruDateParts(yesterdayPeru);
    return {
      inicio: `${yParts.year}-${yParts.month}-${yParts.day}T00:00`,
      fin: `${yParts.year}-${yParts.month}-${yParts.day}T23:59`
    };
  }

  if (type === '24h') {
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return {
      inicio: toPeruInputValue(past24h),
      fin: toPeruInputValue(now)
    };
  }

  if (type === '7d') {
    const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      inicio: toPeruInputValue(past7d),
      fin: toPeruInputValue(now)
    };
  }

  if (type === 'mes') {
    return {
      inicio: `${year}-${month}-01T00:00`,
      fin: `${year}-${month}-${day}T23:59`
    };
  }

  return {
    inicio: `${year}-${month}-${day}T00:00`,
    fin: `${year}-${month}-${day}T23:59`
  };
}

/**
 * Convierte un valor de <input type="datetime-local"> (interpretado como Hora Perú UTC-05:00)
 * a ISO UTC ('...Z') para consultar al backend con precisión exacta al milisegundo.
 * Si isEnd = true y el input solo especifica minutos ('HH:mm'), extiende a ':59.999'.
 */
export function peruInputToUTCISO(inputStr, isEnd = false) {
  if (!inputStr) return new Date().toISOString();
  const s = String(inputStr).trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    return new Date(s).toISOString();
  }
  const timePart = s.split('T')[1] || '';
  const colonCount = (timePart.match(/:/g) || []).length;

  let withOffset;
  if (!s.includes('T')) {
    withOffset = isEnd ? `${s}T23:59:59.999-05:00` : `${s}T00:00:00.000-05:00`;
  } else if (colonCount === 1) {
    withOffset = isEnd ? `${s}:59.999-05:00` : `${s}:00.000-05:00`;
  } else if (colonCount === 2 && !timePart.includes('.')) {
    withOffset = isEnd ? `${s}.999-05:00` : `${s}.000-05:00`;
  } else {
    withOffset = `${s}-05:00`;
  }

  return new Date(withOffset).toISOString();
}
