import React from 'react';
import HintMaterial from '../../components/HintMaterial';

const TYPE_LABELS = {
  cesar:         'Cifrado César',
  morse:         'Código Morse',
  mirror:        'Texto Espejo',
  emoji:         'Emojis',
  number_letter: 'Número-Letra',
};

export default function PuzzlePreview({ puzzle }) {
  return (
    <div className="bg-amber-50 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Vista previa — tal como lo verá el equipo
      </p>
      <h3 className="text-lg font-bold">{puzzle.title}</h3>
      {puzzle.description && <p className="text-gray-600">{puzzle.description}</p>}
      <div className="bg-white rounded-lg p-3 border border-amber-200">
        <p className="text-xs text-gray-400 mb-1">{TYPE_LABELS[puzzle.type] || puzzle.type}</p>
        <p className="font-mono text-2xl font-bold text-amber-800 break-all">
          {puzzle.config?.encodedText}
        </p>
      </div>
      <HintMaterial hint={puzzle.hint_material} />
    </div>
  );
}
