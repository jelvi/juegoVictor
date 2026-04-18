import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { encode as clientEncode, generateHintMaterial } from '@shared/ciphers.js';

const TYPE_LABELS = {
  cesar:         'César (cifrado por desplazamiento)',
  morse:         'Morse',
  mirror:        'Espejo (texto invertido)',
  emoji:         'Emojis',
  number_letter: 'Número-letra',
  gps:           'GPS (búsqueda por localización)',
  trivia:        'Trivia (preguntas y respuestas)',
};

const DEFAULT_EMOJI_MAP = {
  '🍎': 'A', '🐝': 'B', '🌊': 'C', '🐬': 'D', '🐘': 'E',
  '🦊': 'F', '🦒': 'G', '🏠': 'H', '🍦': 'I', '🎸': 'J',
  '🔑': 'K', '🍋': 'L', '🌙': 'M', '🌸': 'N', '🦉': 'Ñ',
  '🐙': 'O', '🐧': 'P', '👑': 'Q', '🌈': 'R', '⭐': 'S',
  '🐯': 'T', '☂️': 'U', '🎻': 'V', '🐋': 'W', '🎮': 'X',
  '🌻': 'Y', '⚡': 'Z',
};

function buildConfig(type, fields) {
  switch (type) {
    case 'cesar':         return { shift: Number(fields.shift) || 3 };
    case 'morse':         return {};
    case 'mirror':        return {};
    case 'emoji':         return { map: fields.emojiMap };
    case 'number_letter': return { startNumber: Number(fields.startNumber) || 1 };
    case 'gps':           return {
      hint:   fields.gpsHint,
      lat:    Number(fields.gpsLat),
      lng:    Number(fields.gpsLng),
      radius: Number(fields.gpsRadius) || 15,
    };
    case 'trivia':        return {
      mode:            fields.triviaMode,
      questionsPerTeam: Number(fields.triviaQPT) || 5,
      selectionMode:   fields.triviaSelMode,
      categoryId:      fields.triviaCatId ? Number(fields.triviaCatId) : null,
      difficulty:      fields.triviaDiff  || null,
    };
    default:              return {};
  }
}

export default function PuzzleForm({ gameId, puzzle, onSaved, onCancel }) {
  const editing = !!puzzle;

  const [title, setTitle]           = useState(puzzle?.title || '');
  const [description, setDesc]      = useState(puzzle?.description || '');
  const [type, setType]             = useState(puzzle?.type || 'cesar');
  const [solution, setSolution]     = useState(puzzle?.solution || '');
  const [orderIndex, setOrderIndex] = useState(puzzle?.order_index ?? 0);
  const [shift, setShift]           = useState(puzzle?.config?.shift ?? 3);
  const [startNumber, setStartNum]  = useState(puzzle?.config?.startNumber ?? 1);
  const [emojiMap, setEmojiMap]     = useState(puzzle?.config?.map || DEFAULT_EMOJI_MAP);

  // GPS
  const [gpsHint,   setGpsHint]   = useState(puzzle?.config?.hint   || '');
  const [gpsLat,    setGpsLat]    = useState(puzzle?.config?.lat     ?? '');
  const [gpsLng,    setGpsLng]    = useState(puzzle?.config?.lng     ?? '');
  const [gpsRadius, setGpsRadius] = useState(puzzle?.config?.radius  ?? 15);
  const [gpsLocating, setGpsLocating] = useState(false);

  // Trivia
  const [triviaMode,   setTriviaMode]   = useState(puzzle?.config?.mode            || 'multiple');
  const [triviaQPT,    setTriviaQPT]    = useState(puzzle?.config?.questionsPerTeam || 5);
  const [triviaSelMode,setTriviaSelMode]= useState(puzzle?.config?.selectionMode   || 'manual');
  const [triviaCatId,  setTriviaCatId]  = useState(puzzle?.config?.categoryId      || '');
  const [triviaDiff,   setTriviaDiff]   = useState(puzzle?.config?.difficulty      || '');
  const [triviaCategories, setTriviaCategories] = useState([]);

  const [preview, setPreview]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  // Cargar categorías para trivia
  useEffect(() => {
    if (type === 'trivia') {
      import('../../utils/api').then(({ api }) =>
        api.get('/questions/categories').then(setTriviaCategories).catch(() => {})
      );
    }
  }, [type]);

  // Actualizar preview en tiempo real
  useEffect(() => {
    if (type === 'gps') {
      setPreview(gpsHint || '');
      return;
    }
    if (type === 'trivia') {
      const modeLabel = { multiple:'opción múltiple', truefalse:'verdadero/falso', open:'respuesta abierta' }[triviaMode] || '';
      setPreview(`${triviaQPT} preguntas · ${modeLabel}`);
      return;
    }
    if (!solution) { setPreview(''); return; }
    try {
      const cfg = buildConfig(type, { shift, startNumber, emojiMap });
      setPreview(clientEncode(type, solution, cfg));
    } catch { setPreview(''); }
  }, [type, solution, shift, startNumber, emojiMap, gpsHint, triviaMode, triviaQPT]);

  async function useMyLocation() {
    if (!navigator.geolocation) { setError('GPS no disponible en este dispositivo.'); return; }
    setGpsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude.toFixed(7));
        setGpsLng(pos.coords.longitude.toFixed(7));
        setGpsLocating(false);
      },
      () => { setError('No se pudo obtener la ubicación.'); setGpsLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Validación GPS
    if (type === 'gps') {
      if (!gpsHint.trim())             { setError('La pista es obligatoria.'); setSaving(false); return; }
      if (!gpsLat || !gpsLng)          { setError('Las coordenadas son obligatorias.'); setSaving(false); return; }
      if (isNaN(Number(gpsLat)) || isNaN(Number(gpsLng))) {
        setError('Coordenadas no válidas.'); setSaving(false); return;
      }
    }

    const config = buildConfig(type, { shift, startNumber, emojiMap, gpsHint, gpsLat, gpsLng, gpsRadius,
      triviaMode, triviaQPT, triviaSelMode, triviaCatId, triviaDiff });
    const effectiveSolution =
      type === 'gps'    ? 'GPS_LOCATION' :
      type === 'trivia' ? 'TRIVIA'       : solution;
    const body = { title, description, type, config, solution: effectiveSolution, order_index: Number(orderIndex) };

    try {
      if (editing) {
        await api.patch(`/puzzles/${puzzle.id}`, body);
      } else {
        await api.post(`/games/${gameId}/puzzles`, body);
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Título</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label">Orden (0 = primero)</label>
          <input type="number" className="input" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} min={0} />
        </div>
      </div>

      <div>
        <label className="label">Descripción / contexto</label>
        <textarea className="input" rows={2} value={description} onChange={(e) => setDesc(e.target.value)} />
      </div>

      <div>
        <label className="label">Tipo de puzzle</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Parámetros según tipo */}
      {type === 'cesar' && (
        <div>
          <label className="label">Desplazamiento (1–27)</label>
          <input type="number" className="input w-32" min={1} max={27} value={shift}
            onChange={(e) => setShift(Number(e.target.value))} />
        </div>
      )}
      {type === 'number_letter' && (
        <div>
          <label className="label">Número de inicio (A=1 ó A=27)</label>
          <select className="input w-40" value={startNumber} onChange={(e) => setStartNum(Number(e.target.value))}>
            <option value={1}>A = 1 (ascendente)</option>
            <option value={27}>A = 27 (descendente)</option>
          </select>
        </div>
      )}
      {type === 'emoji' && (
        <div>
          <label className="label">Mapa emoji → letra (JSON)</label>
          <textarea
            className="input font-mono text-xs"
            rows={6}
            value={JSON.stringify(emojiMap, null, 2)}
            onChange={(e) => {
              try { setEmojiMap(JSON.parse(e.target.value)); } catch {}
            }}
          />
          <p className="text-xs text-gray-400 mt-1">Formato: {`{ "🍎": "A", "🐝": "B", ... }`}</p>
        </div>
      )}

      {/* Campos GPS */}
      {type === 'gps' && (
        <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div>
            <label className="label">Pista para los jugadores</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Ej: Buscad el lugar donde los niños juegan al fútbol…"
              value={gpsHint}
              onChange={(e) => setGpsHint(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Latitud</label>
              <input
                className="input font-mono"
                placeholder="40.4168000"
                value={gpsLat}
                onChange={(e) => setGpsLat(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Longitud</label>
              <input
                className="input font-mono"
                placeholder="-3.7038000"
                value={gpsLng}
                onChange={(e) => setGpsLng(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary w-full text-sm"
            onClick={useMyLocation}
            disabled={gpsLocating}
          >
            {gpsLocating ? '📡 Obteniendo ubicación…' : '📍 Usar mi ubicación actual'}
          </button>

          {gpsLat && gpsLng && (
            <p className="text-xs text-blue-700 text-center font-mono">
              {Number(gpsLat).toFixed(5)}, {Number(gpsLng).toFixed(5)}
            </p>
          )}

          <div>
            <label className="label">Radio de llegada (metros)</label>
            <input
              type="number"
              className="input w-32"
              min={5}
              max={200}
              value={gpsRadius}
              onChange={(e) => setGpsRadius(Number(e.target.value))}
            />
            <p className="text-xs text-gray-400 mt-1">El jugador debe estar a menos de {gpsRadius} m del punto.</p>
          </div>
        </div>
      )}

      {/* Campos trivia */}
      {type === 'trivia' && (
        <div className="space-y-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Modo</label>
              <select className="input" value={triviaMode} onChange={(e) => setTriviaMode(e.target.value)}>
                <option value="multiple">Opción múltiple</option>
                <option value="truefalse">Verdadero / Falso</option>
                <option value="open">Respuesta abierta</option>
              </select>
            </div>
            <div>
              <label className="label">Nº de preguntas</label>
              <input
                type="number" min={1} max={50}
                className="input"
                value={triviaQPT}
                onChange={(e) => setTriviaQPT(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="label">Selección de preguntas</label>
            <select className="input" value={triviaSelMode} onChange={(e) => setTriviaSelMode(e.target.value)}>
              <option value="manual">Manual (elegir del pool)</option>
              <option value="random">Aleatoria del pool</option>
            </select>
          </div>

          {triviaSelMode === 'random' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Filtrar por categoría</label>
                <select className="input" value={triviaCatId} onChange={(e) => setTriviaCatId(e.target.value)}>
                  <option value="">Cualquier categoría</option>
                  {triviaCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Filtrar por dificultad</label>
                <select className="input" value={triviaDiff} onChange={(e) => setTriviaDiff(e.target.value)}>
                  <option value="">Cualquier dificultad</option>
                  <option value="easy">Fácil</option>
                  <option value="medium">Media</option>
                  <option value="hard">Difícil</option>
                </select>
              </div>
            </div>
          )}

          {triviaSelMode === 'manual' && (
            <p className="text-xs text-purple-600">
              💡 Después de guardar el puzzle, asigna las preguntas desde el botón "Preguntas" en la lista.
            </p>
          )}
        </div>
      )}

      {/* Solución para tipos no-GPS y no-trivia */}
      {type !== 'gps' && type !== 'trivia' && (
        <div>
          <label className="label">Solución (texto en claro)</label>
          <input className="input" value={solution} onChange={(e) => setSolution(e.target.value)} required />
        </div>
      )}

      {preview && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">
            {type === 'gps' ? 'Pista que verán los equipos:' : 'Texto cifrado que verán los equipos:'}
          </p>
          <p className={`font-bold text-amber-800 break-all ${type === 'gps' ? 'text-base italic' : 'font-mono text-lg'}`}>
            {preview}
          </p>
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : editing ? 'Actualizar' : 'Crear puzzle'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
