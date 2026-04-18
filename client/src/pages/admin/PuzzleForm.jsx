import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { encode as clientEncode, generateHintMaterial } from '@shared/ciphers.js';

const TYPE_LABELS = {
  cesar:         'César (cifrado por desplazamiento)',
  morse:         'Morse',
  mirror:        'Espejo (texto invertido)',
  emoji:         'Emojis',
  number_letter: 'Número-letra',
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

  const [preview, setPreview]       = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  // Actualizar preview en tiempo real
  useEffect(() => {
    if (!solution) { setPreview(''); return; }
    try {
      const cfg = buildConfig(type, { shift, startNumber, emojiMap });
      setPreview(clientEncode(type, solution, cfg));
    } catch { setPreview(''); }
  }, [type, solution, shift, startNumber, emojiMap]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const config = buildConfig(type, { shift, startNumber, emojiMap });
    const body = { title, description, type, config, solution, order_index: Number(orderIndex) };

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

      <div>
        <label className="label">Solución (texto en claro)</label>
        <input className="input" value={solution} onChange={(e) => setSolution(e.target.value)} required />
      </div>

      {preview && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Texto cifrado que verán los equipos:</p>
          <p className="font-mono text-lg font-bold text-amber-800 break-all">{preview}</p>
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
