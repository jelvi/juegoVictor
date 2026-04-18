/**
 * Wrapper CommonJS que carga el módulo ESM shared/ciphers.js mediante import() dinámico.
 * Uso: const ciphers = await require('./lib/ciphers')();
 *
 * Para simplificar el uso en los controladores se carga una vez al arranque
 * y se guarda en module.exports directamente tras la inicialización.
 */

let _loaded = null;

async function load() {
  if (_loaded) return _loaded;
  _loaded = await import('../../shared/ciphers.js');
  return _loaded;
}

module.exports = load;
