/**
 * shared/ciphers.js
 * Módulo ESM puro — funciona en Vite (cliente) y en Node con
 * `import()` dinámico o con `"type":"module"` en server/package.json.
 *
 * Para añadir un nuevo tipo de puzzle:
 *   1. Implementar { encode, generateHintMaterial } aquí.
 *   2. Registrarlo en CIPHER_REGISTRY.
 *   3. Añadir su formulario en PuzzleForm.jsx.
 */

// Alfabeto español con Ñ (27 letras)
const ALPHABET_ES = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

// ─── César ────────────────────────────────────────────────────────────────────
const cesar = {
  encode(text, config) {
    const shift = Number(config.shift) || 3;
    const n = ALPHABET_ES.length;
    return text
      .toUpperCase()
      .split('')
      .map((ch) => {
        const idx = ALPHABET_ES.indexOf(ch);
        if (idx === -1) return ch;
        return ALPHABET_ES[(idx + shift + n) % n];
      })
      .join('');
  },
  generateHintMaterial(config) {
    const shift = Number(config.shift) || 3;
    const n = ALPHABET_ES.length;
    const table = ALPHABET_ES.split('').map((letter, i) => ({
      original: letter,
      encoded: ALPHABET_ES[(i + shift + n) % n],
    }));
    return { type: 'cesar', shift, table };
  },
};

// ─── Morse ────────────────────────────────────────────────────────────────────
const MORSE_TABLE = {
  A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....',
  I:'..', J:'.---', K:'-.-', L:'.-..', M:'--', N:'-.', Ñ:'--.--', O:'---',
  P:'.--.', Q:'--.-', R:'.-.', S:'...', T:'-', U:'..-', V:'...-', W:'.--',
  X:'-..-', Y:'-.--', Z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-',
  '5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
};

const morse = {
  encode(text, _config) {
    return text.toUpperCase().split('').map((ch) => {
      if (ch === ' ') return '/';
      return MORSE_TABLE[ch] || ch;
    }).join(' ');
  },
  generateHintMaterial(_config) {
    return {
      type: 'morse',
      table: Object.entries(MORSE_TABLE).map(([letter, code]) => ({ letter, code })),
    };
  },
};

// ─── Espejo ───────────────────────────────────────────────────────────────────
const mirror = {
  encode(text, _config) {
    return text.split('').reverse().join('');
  },
  generateHintMaterial(_config) {
    return { type: 'mirror', description: 'Lee el mensaje al revés.' };
  },
};

// ─── Emoji ────────────────────────────────────────────────────────────────────
const emoji = {
  encode(text, config) {
    const map = config.map || {};
    const reverseMap = {};
    for (const [em, letter] of Object.entries(map)) {
      reverseMap[letter.toUpperCase()] = em;
    }
    return text.toUpperCase().split('').map((ch) => reverseMap[ch] || ch).join('');
  },
  generateHintMaterial(config) {
    const table = Object.entries(config.map || {}).map(([em, letter]) => ({
      emoji: em,
      letter: letter.toUpperCase(),
    }));
    return { type: 'emoji', table };
  },
};

// ─── Número-Letra ─────────────────────────────────────────────────────────────
const number_letter = {
  encode(text, config) {
    const start = Number(config.startNumber) || 1;
    const ascending = start === 1;
    return text.toUpperCase().split('').map((ch) => {
      const idx = ALPHABET_ES.indexOf(ch);
      if (idx === -1) return ch;
      return String(ascending ? start + idx : start - idx);
    }).join('-');
  },
  generateHintMaterial(config) {
    const start = Number(config.startNumber) || 1;
    const ascending = start === 1;
    const table = ALPHABET_ES.split('').map((letter, i) => ({
      letter,
      number: ascending ? start + i : start - i,
    }));
    return { type: 'number_letter', startNumber: start, ascending, table };
  },
};

// ─── GPS ──────────────────────────────────────────────────────────────────────
// Para GPS el "texto cifrado" es la pista escrita por el admin.
// Las coordenadas del destino viven solo en config.lat/lng y NUNCA
// se incluyen en hint_material (el servidor las filtra antes de enviar al cliente).
const gps = {
  encode(_text, config) {
    // Lo que se muestra como "texto del puzzle" es la pista, no un cifrado.
    return config.hint || '';
  },
  generateHintMaterial(config) {
    // Solo radio — coordenadas nunca al cliente.
    return { type: 'gps', radius: Number(config.radius) || 15 };
  },
};

// ─── Trivia ───────────────────────────────────────────────────────────────────
// No cifra texto. La config del puzzle contiene: mode, questionsPerTeam, selectionMode.
// La validación es automática en el servidor (sin revisión del admin).
const trivia = {
  encode(_text, config) {
    const n = config.questionsPerTeam || '?';
    const modeLabel = {
      multiple:  'opción múltiple',
      truefalse: 'verdadero/falso',
      open:      'respuesta abierta',
    }[config.mode] || 'preguntas';
    return `${n} preguntas · ${modeLabel}`;
  },
  generateHintMaterial(_config) {
    return { type: 'trivia' };
  },
};

// ─── Prueba física ────────────────────────────────────────────────────────────
// El equipo recoge el material, busca al árbitro y ejecuta la prueba.
// El árbitro aprueba/rechaza manualmente desde el panel en vivo.
const physical = {
  encode(_text, config) {
    return config.description || 'Prueba física';
  },
  generateHintMaterial(config) {
    return { type: 'physical', materials: config.materials || [] };
  },
};

// ─── Registro ─────────────────────────────────────────────────────────────────
export const CIPHER_REGISTRY = { cesar, morse, mirror, emoji, number_letter, gps, trivia, physical };

export function listTypes() {
  return Object.keys(CIPHER_REGISTRY);
}

export function encode(type, text, config) {
  const cipher = CIPHER_REGISTRY[type];
  if (!cipher) throw new Error(`Tipo desconocido: ${type}`);
  return cipher.encode(text, config);
}

export function generateHintMaterial(type, config) {
  const cipher = CIPHER_REGISTRY[type];
  if (!cipher) throw new Error(`Tipo desconocido: ${type}`);
  return cipher.generateHintMaterial(config);
}

export function validateAnswer(submitted, solution) {
  return submitted.trim().toUpperCase() === solution.trim().toUpperCase();
}
