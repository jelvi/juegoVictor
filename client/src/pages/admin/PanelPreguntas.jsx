import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import FormPregunta from './FormPregunta';
import ImportarPreguntas from './ImportarPreguntas';

const DIFFICULTY_LABELS = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };

/**
 * Panel de gestión del pool global de preguntas.
 * Se muestra como una pestaña dentro del editor de juego.
 */
export default function PanelPreguntas() {
  const [subTab,      setSubTab]      = useState('mis');    // 'importar' | 'mis' | 'revisar'
  const [questions,   setQuestions]   = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [showForm,    setShowForm]    = useState(false);
  const [editingQ,    setEditingQ]    = useState(null);
  const [filterCat,   setFilterCat]   = useState('');
  const [filterDiff,  setFilterDiff]  = useState('');
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(false);
  const [inlineEdit,  setInlineEdit]  = useState({}); // { [id]: text }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const reviewed = subTab === 'revisar' ? false : subTab === 'mis' ? true : undefined;
      const params = new URLSearchParams();
      if (filterCat)  params.set('category',  filterCat);
      if (filterDiff) params.set('difficulty', filterDiff);
      if (search)     params.set('search',     search);
      if (reviewed !== undefined) params.set('reviewed', reviewed);

      const [qs, cats] = await Promise.all([
        api.get(`/questions?${params}`),
        api.get('/questions/categories'),
      ]);
      setQuestions(qs);
      setCategories(cats);
    } catch {}
    setLoading(false);
  }, [subTab, filterCat, filterDiff, search]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id) {
    const text = inlineEdit[id];
    await api.patch(`/questions/${id}`, {
      reviewed: true,
      ...(text ? { question_text: text } : {}),
    });
    setInlineEdit((prev) => { const n = { ...prev }; delete n[id]; return n; });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    await api.delete(`/questions/${id}`);
    load();
  }

  const TABS = [
    { key: 'importar', label: '🌐 Importar' },
    { key: 'mis',      label: '✏️ Mis preguntas' },
    { key: 'revisar',  label: '🔍 Revisar importadas' },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-amber-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setSubTab(t.key); setShowForm(false); setEditingQ(null); }}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors
              ${subTab === t.key
                ? 'bg-white border border-b-white border-amber-200 -mb-px text-primary-600'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Importar ─────────────────────────────────────────────────────────── */}
      {subTab === 'importar' && (
        <ImportarPreguntas onImported={load} />
      )}

      {/* ── Mis preguntas ─────────────────────────────────────────────────── */}
      {subTab === 'mis' && (
        <div className="space-y-3">
          {(showForm || editingQ) ? (
            <div className="card">
              <h3 className="font-bold mb-3">{editingQ ? 'Editar pregunta' : 'Nueva pregunta'}</h3>
              <FormPregunta
                question={editingQ}
                categories={categories}
                onSaved={() => { setShowForm(false); setEditingQ(null); load(); }}
                onCancel={() => { setShowForm(false); setEditingQ(null); }}
              />
            </div>
          ) : (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Nueva pregunta
            </button>
          )}

          <Filters
            categories={categories}
            filterCat={filterCat} setFilterCat={setFilterCat}
            filterDiff={filterDiff} setFilterDiff={setFilterDiff}
            search={search} setSearch={setSearch}
          />

          <QuestionList
            questions={questions}
            loading={loading}
            onEdit={(q) => setEditingQ(q)}
            onDelete={handleDelete}
            showApproveButton={false}
          />
        </div>
      )}

      {/* ── Revisar importadas ───────────────────────────────────────────── */}
      {subTab === 'revisar' && (
        <div className="space-y-3">
          {questions.length === 0 && !loading && (
            <p className="text-gray-400 text-center py-8">
              No hay preguntas pendientes de revisión.
            </p>
          )}
          {loading && <p className="text-gray-400 text-center py-4">Cargando…</p>}
          {questions.map((q) => (
            <div key={q.id} className="card border-yellow-200 bg-yellow-50 space-y-3">
              <div className="flex gap-2 justify-between flex-wrap">
                <span className={`badge-${q.difficulty === 'easy' ? 'approved' : q.difficulty === 'hard' ? 'rejected' : 'submitted'}`}>
                  {DIFFICULTY_LABELS[q.difficulty]}
                </span>
                {q.category_name && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {q.category_name}
                  </span>
                )}
              </div>

              {/* Edición inline del texto */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Pregunta (edita si la traducción es incorrecta):</p>
                <textarea
                  className="input text-sm"
                  rows={2}
                  value={inlineEdit[q.id] ?? q.question_text}
                  onChange={(e) =>
                    setInlineEdit((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                />
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Respuesta correcta:</p>
                <p className="text-sm font-semibold text-green-700">{q.correct_answer}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Incorrectas:</p>
                <p className="text-sm text-gray-600">{(q.wrong_answers || []).join(' · ')}</p>
              </div>

              <div className="flex gap-2">
                <button className="btn-success text-sm" onClick={() => handleApprove(q.id)}>
                  ✓ Aprobar
                </button>
                <button className="btn-danger text-sm" onClick={() => handleDelete(q.id)}>
                  ✗ Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────
function Filters({ categories, filterCat, setFilterCat, filterDiff, setFilterDiff, search, setSearch }) {
  return (
    <div className="flex gap-2 flex-wrap">
      <input
        className="input flex-1 min-w-32 text-sm"
        placeholder="Buscar…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select className="input w-40 text-sm" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
        <option value="">Todas las categorías</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="input w-36 text-sm" value={filterDiff} onChange={(e) => setFilterDiff(e.target.value)}>
        <option value="">Toda dificultad</option>
        <option value="easy">Fácil</option>
        <option value="medium">Media</option>
        <option value="hard">Difícil</option>
      </select>
    </div>
  );
}

function QuestionList({ questions, loading, onEdit, onDelete, showApproveButton }) {
  if (loading) return <p className="text-gray-400 text-center py-4">Cargando…</p>;
  if (!questions.length) return <p className="text-gray-400 text-center py-6">No hay preguntas.</p>;

  return (
    <div className="space-y-2">
      {questions.map((q) => (
        <div key={q.id} className="card flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug">{q.question_text}</p>
            <p className="text-xs text-green-600 mt-1">✓ {q.correct_answer}</p>
            {q.category_name && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded mt-1 inline-block">
                {q.category_name}
              </span>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button className="btn-secondary text-xs" onClick={() => onEdit(q)}>Editar</button>
            <button className="btn-danger text-xs"    onClick={() => onDelete(q.id)}>✗</button>
          </div>
        </div>
      ))}
    </div>
  );
}
