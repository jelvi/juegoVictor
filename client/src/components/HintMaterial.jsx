import React, { useState } from 'react';

export default function HintMaterial({ hint }) {
  const [open, setOpen] = useState(false);
  if (!hint) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-primary-600 font-medium underline underline-offset-2"
      >
        {open ? '▲ Ocultar tabla de ayuda' : '▼ Ver tabla de ayuda'}
      </button>

      {open && (
        <div className="mt-2 overflow-x-auto">
          {hint.type === 'cesar' && <CesarTable table={hint.table} />}
          {hint.type === 'morse' && <MorseTable table={hint.table} />}
          {hint.type === 'mirror' && <p className="text-sm text-gray-600 italic">{hint.description}</p>}
          {hint.type === 'emoji' && <EmojiTable table={hint.table} />}
          {hint.type === 'number_letter' && <NumberLetterTable table={hint.table} />}
        </div>
      )}
    </div>
  );
}

function CesarTable({ table }) {
  return (
    <table className="text-xs border-collapse">
      <thead>
        <tr className="bg-amber-100">
          <th className="border border-amber-200 px-2 py-1">Original</th>
          <th className="border border-amber-200 px-2 py-1">Cifrada</th>
        </tr>
      </thead>
      <tbody>
        {table.map((r) => (
          <tr key={r.original} className="even:bg-amber-50">
            <td className="border border-amber-200 px-2 py-1 text-center font-mono">{r.original}</td>
            <td className="border border-amber-200 px-2 py-1 text-center font-mono">{r.encoded}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MorseTable({ table }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
      {table.map((r) => (
        <div key={r.letter} className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs text-center">
          <span className="font-bold">{r.letter}</span>
          <span className="block font-mono text-gray-600">{r.code}</span>
        </div>
      ))}
    </div>
  );
}

function EmojiTable({ table }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
      {table.map((r) => (
        <div key={r.letter} className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-center">
          <span className="text-2xl">{r.emoji}</span>
          <span className="block text-xs font-bold">{r.letter}</span>
        </div>
      ))}
    </div>
  );
}

function NumberLetterTable({ table }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
      {table.map((r) => (
        <div key={r.letter} className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs text-center">
          <span className="font-bold">{r.letter}</span>
          <span className="block font-mono text-gray-600">{r.number}</span>
        </div>
      ))}
    </div>
  );
}
