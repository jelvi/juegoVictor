import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const DIFFICULTY_OPTIONS = [
  { value: 'easy',   label: 'Fácil' },
  { value: 'medium', label: 'Media' },
  { value: 'hard',   label: 'Difícil' },
];

/**
 * Formulario para crear/editar una pregunta manualmente.
 * Props:
 *   question   — pregunta a editar (null = nueva)
 *   categories — array de categorías
 *   onSaved    — callback cuando se guarda
 *   onCancel   — callback para cancelar
 */
export default function FormPregunta({ question, categories, onSaved, onCancel }) {
  const editing = !!question;

  const [questionText,   setQuestionText]   = useState(question?.question_text   || '');
  const [correctAnswer,  setCorrectAnswer]  = useState(question?.correct_answer  || '');
  const [wrongAnswers,   setWrongAnswers]   = useState(
    question?.wrong_answers?.length ? question.wrong_answers : ['', '', '']
  );
  const [difficulty,     setDifficulty]    = useState(question?.difficulty       || 'medium');
  const [categoryId,     setCategoryId]    = useState(question?.category_id      || '');
  const [newCategory,    setNewCategory]   = useState('');
  const [saving,         setSaving]        = useState(false);
  const [error,          setError]         = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!questionText.trim() || !correctAnswer.trim()) {
      setError('La pregunta y la respuesta correcta son obligatorias.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let catId = categoryId || null;
      // Crear categoría nueva si el admin escribió una
      if (newCategory.trim()) {
        const cat = await api.post('/questions/categories', { name: newCategory.trim() });
        catId = cat.id;
      }

      const body = {
        question_text:  questionText.trim(),
        correct_answer: correctAnswer.trim(),
        wrong_answers:  wrongAnswers.filter(Boolean).map((w) => w.trim()),
        difficulty,
        category_id:    catId ? Number(catId) : null,
      };

      if (editing) {
        await api.patch(`/questions/${question.id}`, body);
      } else {
        await api.post('/questions', body);
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function updateWrong(i, val) {
    setWrongAnswers((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Pregunta</label>
        <textarea
          className="input"
          rows={3}
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="¿Cuál es la capital de España?"
          required
        />
      </div>

      <div>
        <label className="label">Respuesta correcta</label>
        <input
          className="input"
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(e.target.value)}
          placeholder="Madrid"
          required
        />
      </div>

      <div>
        <label className="label">Respuestas incorrectas (hasta 3)</label>
        <div className="space-y-2">
          {wrongAnswers.map((w, i) => (
            <input
              key={i}
              className="input"
              value={w}
              onChange={(e) => updateWrong(i, e.target.value)}
              placeholder={`Respuesta incorrecta ${i + 1}`}
            />
          ))}
        </div>
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
          <label className="label">Categoría</label>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">O crear categoría nueva</label>
        <input
          className="input"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Ej: Sobre la urbanización"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : editing ? 'Actualizar' : 'Crear pregunta'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
