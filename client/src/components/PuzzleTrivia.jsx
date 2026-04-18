import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const DIFFICULTY_LABELS = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };

/**
 * Vista del equipo para puzzles de trivia.
 * Props:
 *   puzzle        — objeto puzzle (sin solution)
 *   triviaState   — { currentQuestion, totalQuestions, answeredCount, answers }
 *   teamId        — id del equipo
 *   progressStatus — estado actual en team_progress
 *   onRefresh     — callback para recargar el puzzle actual
 */
export default function PuzzleTrivia({ puzzle, triviaState, teamId, progressStatus, onRefresh }) {
  const [phase, setPhase]         = useState('answering'); // 'answering' | 'result'
  const [lastResult, setLastResult] = useState(null);      // { correct, correctAnswer }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]          = useState('');

  const cfg  = puzzle.config || {};
  const mode = cfg.mode || 'multiple';
  const { currentQuestion, totalQuestions, answeredCount, answers } = triviaState || {};

  // Resetear fase cuando llega una nueva pregunta
  useEffect(() => {
    setPhase('answering');
    setLastResult(null);
    setError('');
  }, [currentQuestion?.id]);

  async function handleAnswer(answer) {
    setSubmitting(true);
    setError('');
    try {
      const result = await api.post(
        `/progress/${teamId}/${puzzle.id}/trivia-answer`,
        { questionId: currentQuestion.id, answer }
      );
      setLastResult(result);
      setPhase('result');
      if (result.completed) {
        // Dar un momento y recargar para que progress pase a 'approved'
        setTimeout(onRefresh, 1200);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleContinue() {
    setPhase('answering');
    setLastResult(null);
    onRefresh();
  }

  // ── Sin preguntas asignadas ────────────────────────────────────────────────
  if (!totalQuestions) {
    return (
      <div className="card text-center text-gray-400 py-8">
        Este puzzle aún no tiene preguntas asignadas.
      </div>
    );
  }

  const progress = answeredCount ?? 0;

  return (
    <div className="space-y-4">
      {/* Barra de progreso */}
      <div className="card">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Progreso</span>
          <span>{progress} / {totalQuestions}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-primary-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(progress / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Historial de respuestas */}
      {answers?.length > 0 && (
        <div className="card">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Respondidas</p>
          <div className="space-y-1">
            {answers.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span>{a.correct ? '✅' : '❌'}</span>
                <span className="text-gray-500 truncate">Pregunta {i + 1}</span>
                {!a.correct && a.correct_answer && (
                  <span className="text-xs text-gray-400 ml-auto">→ {a.correct_answer}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pregunta actual */}
      {phase === 'answering' && currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          mode={mode}
          submitting={submitting}
          error={error}
          onAnswer={handleAnswer}
          questionNumber={progress + 1}
          total={totalQuestions}
        />
      )}

      {/* Resultado */}
      {phase === 'result' && lastResult && (
        <ResultCard
          result={lastResult}
          onContinue={handleContinue}
        />
      )}

      {/* Todas respondidas, esperando aprobación automática */}
      {!currentQuestion && phase === 'answering' && progress >= totalQuestions && (
        <div className="card text-center py-6 space-y-2">
          <p className="text-3xl">🎉</p>
          <p className="font-bold text-lg">¡Has respondido todas las preguntas!</p>
          <p className="text-sm text-gray-500 animate-pulse">Cargando siguiente reto…</p>
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta de pregunta ──────────────────────────────────────────────────────
function QuestionCard({ question, mode, submitting, error, onAnswer, questionNumber, total }) {
  const [openAnswer, setOpenAnswer] = useState('');

  if (mode === 'open') {
    return (
      <div className="card space-y-4">
        <QuestionHeader question={question} number={questionNumber} total={total} />
        <input
          className="input text-lg"
          placeholder="Escribe tu respuesta…"
          value={openAnswer}
          onChange={(e) => setOpenAnswer(e.target.value)}
          autoCapitalize="off"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          className="btn-primary w-full"
          disabled={submitting || !openAnswer.trim()}
          onClick={() => onAnswer(openAnswer.trim())}
        >
          {submitting ? 'Enviando…' : 'Responder'}
        </button>
      </div>
    );
  }

  const options = question.options || [];

  if (mode === 'truefalse') {
    return (
      <div className="card space-y-4">
        <QuestionHeader question={question} number={questionNumber} total={total} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          {['Verdadero', 'Falso'].map((opt) => (
            <button
              key={opt}
              className={`py-4 rounded-xl font-bold text-lg transition-colors border-2
                ${opt === 'Verdadero'
                  ? 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100'
                  : 'bg-red-50 border-red-300 text-red-800 hover:bg-red-100'}
                disabled:opacity-50`}
              disabled={submitting}
              onClick={() => onAnswer(opt)}
            >
              {opt === 'Verdadero' ? '✓' : '✗'} {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // multiple (default)
  const colors = [
    'bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100',
    'bg-violet-50 border-violet-300 text-violet-900 hover:bg-violet-100',
    'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100',
    'bg-pink-50 border-pink-300 text-pink-900 hover:bg-pink-100',
  ];

  return (
    <div className="card space-y-4">
      <QuestionHeader question={question} number={questionNumber} total={total} />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="space-y-2">
        {options.map((opt, i) => (
          <button
            key={opt}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium transition-colors
              ${colors[i % colors.length]} disabled:opacity-50`}
            disabled={submitting}
            onClick={() => onAnswer(opt)}
          >
            <span className="font-bold mr-2">{['A', 'B', 'C', 'D'][i]}.</span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuestionHeader({ question, number, total }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
        Pregunta {number} de {total}
      </p>
      <p className="text-lg font-semibold leading-snug">{question.question_text}</p>
    </div>
  );
}

// ─── Tarjeta de resultado ─────────────────────────────────────────────────────
function ResultCard({ result, onContinue }) {
  const { correct, correctAnswer, completed } = result;
  return (
    <div className={`card text-center space-y-4 border-2
      ${correct ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
      <p className="text-5xl">{correct ? '✅' : '❌'}</p>
      <p className={`font-bold text-xl ${correct ? 'text-green-800' : 'text-red-800'}`}>
        {correct ? '¡Correcto!' : '¡Incorrecto!'}
      </p>
      {!correct && correctAnswer && (
        <div className="bg-white rounded-xl px-4 py-2 border border-red-200">
          <p className="text-sm text-gray-500">La respuesta correcta era:</p>
          <p className="font-bold text-gray-800">{correctAnswer}</p>
        </div>
      )}
      {!completed && (
        <button className="btn-primary w-full" onClick={onContinue}>
          Siguiente pregunta →
        </button>
      )}
    </div>
  );
}
