import { Router } from 'express'
import { randomInt } from 'node:crypto'
import { pool, transacao } from '../db.js'
import { ALFABETO, normalizarCodigo } from '../validacao.js'

const router = Router()

const MAX_LOTE = 200

function sortearCodigo() {
  let c = ''
  for (let i = 0; i < 6; i++) c += ALFABETO[randomInt(ALFABETO.length)]
  return c
}

const SELECT_PLACA = `
  SELECT p.codigo, p.estado, p.lote_id, l.nome AS lote_nome, p.cliente_id,
         c.slug AS cliente_slug, c.dados->>'businessName' AS cliente_nome,
         p.ultimo_cliente, p.vinculada_em, p.criada_em
    FROM placas p
    JOIN lotes l ON l.id = p.lote_id
    LEFT JOIN clientes c ON c.id = p.cliente_id`

function formatar(r) {
  return {
    codigo: r.codigo, estado: r.estado,
    lote: { id: r.lote_id, nome: r.lote_nome },
    cliente: r.cliente_id ? { id: r.cliente_id, slug: r.cliente_slug, nome: r.cliente_nome } : null,
    ultimoCliente: r.ultimo_cliente, vinculadaEm: r.vinculada_em, criadaEm: r.criada_em
  }
}

async function buscar(codigo) {
  const { rows } = await pool.query(`${SELECT_PLACA} WHERE p.codigo = $1`, [codigo])
  return rows[0] ? formatar(rows[0]) : null
}

/* ---------- lotes ---------- */
export const lotes = Router()

lotes.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT l.id, l.nome, l.quantidade, l.criado_em,
           count(*) FILTER (WHERE p.estado = 'livre')   AS livres,
           count(*) FILTER (WHERE p.estado = 'ativa')   AS ativas,
           count(*) FILTER (WHERE p.estado = 'inativa') AS inativas
      FROM lotes l LEFT JOIN placas p ON p.lote_id = l.id
     GROUP BY l.id ORDER BY l.id DESC`)
  res.json(rows.map(r => ({
    id: r.id, nome: r.nome, quantidade: r.quantidade, criadoEm: r.criado_em,
    livres: Number(r.livres), ativas: Number(r.ativas), inativas: Number(r.inativas)
  })))
})

lotes.post('/', async (req, res) => {
  const quantidade = Number((req.body || {}).quantidade)
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_LOTE) {
    return res.status(400).json({ erro: `Quantidade entre 1 e ${MAX_LOTE}.` })
  }

  const resultado = await transacao(async db => {
    // Nome padrão "Lote 3 — 25/09/2026"; o número vem do próprio id.
    const nomeInformado = String((req.body || {}).nome || '').trim().slice(0, 80)
    const { rows } = await db.query(
      'INSERT INTO lotes (nome, quantidade) VALUES ($1, $2) RETURNING id', ['', quantidade])
    const id = rows[0].id
    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const nome = nomeInformado || `Lote ${id} — ${hoje}`
    await db.query('UPDATE lotes SET nome = $1 WHERE id = $2', [nome, id])

    // Sorteia até ter `quantidade` códigos inéditos. Com 31^6 ≈ 887 milhões de
    // combinações colisão é raríssima, mas o ON CONFLICT garante mesmo assim.
    const codigos = []
    while (codigos.length < quantidade) {
      const r = await db.query(
        'INSERT INTO placas (codigo, lote_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING codigo',
        [sortearCodigo(), id])
      if (r.rows[0]) codigos.push(r.rows[0].codigo)
    }
    return { id, nome, quantidade, codigos }
  })

  res.status(201).json(resultado)
})

/* ---------- placas ---------- */
router.get('/', async (req, res) => {
  const filtros = []
  const valores = []
  if (req.query.lote) { valores.push(Number(req.query.lote)); filtros.push(`p.lote_id = $${valores.length}`) }
  if (['livre', 'ativa', 'inativa'].includes(req.query.estado)) {
    valores.push(req.query.estado); filtros.push(`p.estado = $${valores.length}`)
  }
  const where = filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''
  const { rows } = await pool.query(`${SELECT_PLACA} ${where} ORDER BY p.lote_id DESC, p.criada_em, p.codigo`, valores)
  res.json(rows.map(formatar))
})

router.get('/:codigo', async (req, res) => {
  const codigo = normalizarCodigo(req.params.codigo)
  const placa = codigo && await buscar(codigo)
  if (!placa) return res.status(404).json({ erro: 'Placa não encontrada. Confira o código.' })
  res.json(placa)
})

// Só vincula placa livre. A condição fica no próprio UPDATE: se duas pessoas
// vincularem a mesma placa ao mesmo tempo, só uma ganha.
router.post('/:codigo/vincular', async (req, res) => {
  const codigo = normalizarCodigo(req.params.codigo)
  const clienteId = Number((req.body || {}).clienteId)
  if (!codigo) return res.status(404).json({ erro: 'Placa não encontrada. Confira o código.' })

  const cli = await pool.query('SELECT 1 FROM clientes WHERE id = $1', [clienteId])
  if (!cli.rows[0]) return res.status(400).json({ erro: 'Cliente não encontrado. Salve o cliente antes.' })

  const { rowCount } = await pool.query(
    `UPDATE placas SET estado = 'ativa', cliente_id = $2, vinculada_em = now()
      WHERE codigo = $1 AND estado = 'livre'`, [codigo, clienteId])

  if (!rowCount) {
    const atual = await buscar(codigo)
    if (!atual) return res.status(404).json({ erro: 'Placa não encontrada. Confira o código.' })
    const motivo = atual.estado === 'ativa'
      ? `Esta placa já está vinculada a ${atual.cliente.nome}.`
      : 'Esta placa está inativa (pode estar na loja de um ex-cliente). Libere-a em Placas antes de reutilizar.'
    return res.status(409).json({ erro: motivo, placa: atual })
  }
  res.json(await buscar(codigo))
})

// destino 'livre': a placa física voltou para nós (ex.: vinculada por engano).
// destino 'inativa': ela ficou na loja; não pode ir para outro cliente.
router.post('/:codigo/desvincular', async (req, res) => {
  const codigo = normalizarCodigo(req.params.codigo)
  const destino = (req.body || {}).destino
  if (!['livre', 'inativa'].includes(destino)) return res.status(400).json({ erro: 'Destino inválido.' })
  if (!codigo) return res.status(404).json({ erro: 'Placa não encontrada.' })

  const { rowCount } = await pool.query(
    `UPDATE placas p
        SET estado = $2, cliente_id = NULL, vinculada_em = NULL,
            ultimo_cliente = (SELECT dados->>'businessName' FROM clientes WHERE id = p.cliente_id)
      WHERE codigo = $1 AND estado = 'ativa'`, [codigo, destino])
  if (!rowCount) return res.status(409).json({ erro: 'Só dá para desvincular uma placa ativa.' })
  res.json(await buscar(codigo))
})

// Inativa → livre. Só quando a placa física estiver de volta nas nossas mãos.
router.post('/:codigo/liberar', async (req, res) => {
  const codigo = normalizarCodigo(req.params.codigo)
  if (!codigo) return res.status(404).json({ erro: 'Placa não encontrada.' })
  const { rowCount } = await pool.query(
    `UPDATE placas SET estado = 'livre' WHERE codigo = $1 AND estado = 'inativa'`, [codigo])
  if (!rowCount) return res.status(409).json({ erro: 'Só dá para liberar uma placa inativa.' })
  res.json(await buscar(codigo))
})

export default router
