import type { Stage } from '../types'

// Fallback anti-silêncio: nosso guardrail garante que o agente SEMPRE responde algo.
// Se o modelo devolver vazio (bug/vazamento), usamos uma mensagem neutra em vez de
// deixar o cliente sem resposta.
const GENERIC_FALLBACK = 'Só um instante, já te respondo!'

// Blinda a resposta antes de enviar: normaliza espaçamento (colapsa linhas em branco
// excessivas) e garante o anti-silêncio.
export const guard: Stage = async ({ responseText }) => {
  const normalized = (responseText ?? '').replace(/\n{3,}/g, '\n\n').trim()
  return { responseText: normalized || GENERIC_FALLBACK }
}
