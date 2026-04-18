const Anthropic = require('@anthropic-ai/sdk');

let _client = null;
function client() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY no configurada en .env');
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

/**
 * Decodifica entidades HTML comunes que devuelve OpenTDB.
 */
function decodeHtml(text) {
  return String(text)
    .replace(/&amp;/g,   '&')
    .replace(/&lt;/g,    '<')
    .replace(/&gt;/g,    '>')
    .replace(/&quot;/g,  '"')
    .replace(/&#039;/g,  "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g,'...')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&eacute;/g,'é')
    .replace(/&ntilde;/g,'ñ')
    .replace(/&uuml;/g,  'ü')
    .replace(/&ouml;/g,  'ö')
    .replace(/&auml;/g,  'ä');
}

/**
 * Traduce un lote de preguntas de trivia al español para niños de 10-13 años.
 * @param {Array<{question: string, correct_answer: string, wrong_answers: string[]}>} questions
 * @returns {Promise<Array<{question_text: string, correct_answer: string, wrong_answers: string[]}>>}
 */
async function translateQuestions(questions) {
  // Limpiar HTML antes de enviar a Claude
  const clean = questions.map((q) => ({
    question:       decodeHtml(q.question),
    correct_answer: decodeHtml(q.correct_answer),
    wrong_answers:  q.wrong_answers.map(decodeHtml),
  }));

  const prompt = `Traduce estas preguntas de trivia al español natural y sencillo para niños de 10 a 13 años.
Adapta el lenguaje para que sea claro y comprensible para esa edad, pero mantén la precisión factual.
Si la respuesta correcta o incorrecta es "True" o "False", tradúcelas a "Verdadero" / "Falso".

Devuelve ÚNICAMENTE un array JSON válido, sin ningún texto adicional ni bloques de código.
Cada elemento debe tener exactamente estas claves: "question_text", "correct_answer", "wrong_answers" (array de strings).

Input:
${JSON.stringify(clean, null, 2)}`;

  const response = await client().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('La respuesta de traducción no contiene JSON válido');

  return JSON.parse(match[0]);
}

module.exports = { translateQuestions, decodeHtml };
