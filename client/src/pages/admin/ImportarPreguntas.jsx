import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const DIFFICULTY_OPTIONS = [
  { value: '',       label: 'Todas las dificultades' },
  { value: 'easy',   label: 'Fácil' },
  { value: 'medium', label: 'Media' },
  { value: 'hard',   label: 'Difícil' },
];

const AMOUNT_OPTIONS = [10, 20, 50];

export default function ImportarPreguntas({ onImported }) {
  const [opentdbCategories, setOpentdbCategories] = useState([]);
  const [selectedCategory,  setSelectedCategory]  = useState('');
  const [difficulty,        setDifficulty]         = useState('easy');
  const [amount,            setAmount]             = useState(10);
  const [importing,         setImporting]          = useState(false);
  const [result,            setResult]             = useState(null);
  const [error,             setError]              = useState('');

  // Cargar categorías de OpenTDB directamente en el cliente
  useEffect(() => {
    fetch('https://opentdb.com/api_category.php')
      .then((r) => r.json())
      .then((d) => setOpentdbCategories(d.trivia_categories || []))
      .catch(() => setError('No se pudieron cargar las categorías de OpenTDB.'));
  }, []);

  async function handleImport(e) {
    e.preventDefault();
    setImporting(true);
    setResult(null);
    setError('');

    const cat = opentdbCategories.find((c) => String(c.id) === selectedCategory);

    try {
      const data = await api.post('/questions/import', {
        category:     selectedCategory || null,
        difficulty:   difficulty       || null,
        amount,
        categoryName: cat?.name || null,
      });
      setResult(data);
      onImported?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
        Las preguntas se importan de <strong>Open Trivia DB</strong>, se traducen al español
        con IA y se guardan como <em>no revisadas</em>. Revísalas antes de usarlas.
      </div>

      <form onSubmit={handleImport} className="space-y-4">
        <div>
          <label className="label">Categoría (OpenTDB)</label>
          <select
            className="input"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {opentdbCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Dificultad</label>
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cantidad</label>
            <select className="input" value={amount} onChange={(e) => setAmount(Number(e.target.value))}>
              {AMOUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} preguntas</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={importing}>
          {importing
            ? '⏳ Importando y traduciendo… (puede tardar unos segundos)'
            : '🌐 Importar y traducir con IA'}
        </button>
      </form>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">
          ✅ Se importaron <strong>{result.imported}</strong> preguntas correctamente.
          Ve a la pestaña <em>"Revisar importadas"</em> para aprobarlas.
        </div>
      )}
    </div>
  );
}
