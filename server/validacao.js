// Regras compartilhadas pelas rotas. O painel valida as mesmas coisas antes de
// enviar, mas o servidor não confia nisso: a API é pública na internet.

export const RE_SLUG = /^[a-z0-9-]{1,60}$/
export const RE_COR = /^#[0-9a-f]{6}$/i

// Sem 0/O, 1/I/L: o código é lido e digitado por gente, olhando uma placa.
export const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const RE_CODIGO = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/

// Aceita "k7m2qx", " K7M2QX " — quem digita não precisa acertar a caixa.
export function normalizarCodigo(bruto) {
  const c = String(bruto || '').trim().toUpperCase()
  return RE_CODIGO.test(c) ? c : null
}

// Ordem = formato que a landing lê e que o painel envia.
export const CAMPOS = ['businessName', 'headline', 'lede', 'googleReviewUrl',
  'whatsappNumber', 'step2Title', 'rewardText', 'whatsappMessage', 'accentColor']

const LIMITE_TEXTO = 500

// Devolve { dados } limpo ou { erro } com a primeira mensagem.
export function validarCliente(corpo) {
  if (!corpo || typeof corpo !== 'object') return { erro: 'Corpo inválido' }

  const slug = String(corpo.slug || '')
  if (!RE_SLUG.test(slug)) return { erro: 'Identificador inválido: só letras minúsculas, números e hífen.' }

  const bruto = corpo.dados
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return { erro: 'Dados do cliente ausentes' }

  const dados = {}
  for (const campo of CAMPOS) {
    const v = bruto[campo]
    if (v != null && typeof v !== 'string') return { erro: `Campo ${campo} inválido` }
    dados[campo] = (v || '').slice(0, LIMITE_TEXTO)
  }

  dados.whatsappNumber = dados.whatsappNumber.replace(/\D/g, '')
  dados.accentColor = dados.accentColor.trim()

  if (!dados.businessName.trim()) return { erro: 'Informe o nome do negócio.' }
  if (dados.whatsappNumber.length < 12 || dados.whatsappNumber.length > 15) {
    return { erro: 'WhatsApp inválido: inclua DDI e DDD.' }
  }
  if (dados.googleReviewUrl.trim() && !/^https?:\/\/\S+$/i.test(dados.googleReviewUrl.trim())) {
    return { erro: 'Link do Google inválido.' }
  }
  if (!RE_COR.test(dados.accentColor)) return { erro: 'Cor inválida: use #RRGGBB.' }

  return { slug, dados }
}
