import { Router } from 'express'
import { pool, transacao } from '../db.js'
import { validarCliente } from '../validacao.js'

const router = Router()

const SELECT_CLIENTE = `
  SELECT c.id, c.slug, c.dados, c.atualizado_em,
         COALESCE(array_agg(p.codigo ORDER BY p.vinculada_em)
                  FILTER (WHERE p.codigo IS NOT NULL), '{}') AS placas
    FROM clientes c
    LEFT JOIN placas p ON p.cliente_id = c.id AND p.estado = 'ativa'`

function formatar(linha) {
  return { id: linha.id, slug: linha.slug, dados: linha.dados, placas: linha.placas, atualizadoEm: linha.atualizado_em }
}

async function buscar(id) {
  const { rows } = await pool.query(`${SELECT_CLIENTE} WHERE c.id = $1 GROUP BY c.id`, [id])
  return rows[0] ? formatar(rows[0]) : null
}

// Violação do UNIQUE de slug vira mensagem para o campo, não erro 500.
function slugDuplicado(erro) {
  return erro.code === '23505' && /slug/.test(erro.constraint || '')
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`${SELECT_CLIENTE} GROUP BY c.id ORDER BY c.dados->>'businessName'`)
  res.json(rows.map(formatar))
})

router.post('/', async (req, res) => {
  const v = validarCliente(req.body)
  if (v.erro) return res.status(400).json({ erro: v.erro })
  try {
    const { rows } = await pool.query(
      'INSERT INTO clientes (slug, dados) VALUES ($1, $2) RETURNING id', [v.slug, v.dados])
    res.status(201).json(await buscar(rows[0].id))
  } catch (erro) {
    if (slugDuplicado(erro)) return res.status(409).json({ erro: 'Já existe um cliente com este identificador.', campo: 'slug' })
    throw erro
  }
})

router.put('/:id', async (req, res) => {
  const v = validarCliente(req.body)
  if (v.erro) return res.status(400).json({ erro: v.erro })
  try {
    const { rowCount } = await pool.query(
      'UPDATE clientes SET slug = $1, dados = $2, atualizado_em = now() WHERE id = $3',
      [v.slug, v.dados, Number(req.params.id)])
    if (!rowCount) return res.status(404).json({ erro: 'Cliente não encontrado' })
    res.json(await buscar(Number(req.params.id)))
  } catch (erro) {
    if (slugDuplicado(erro)) return res.status(409).json({ erro: 'Já existe um cliente com este identificador.', campo: 'slug' })
    throw erro
  }
})

// As placas ativas do cliente viram inativas, não livres: elas continuam
// penduradas na loja dele. Ver os três estados em schema.sql.
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const inativadas = await transacao(async db => {
    const { rows } = await db.query('SELECT dados FROM clientes WHERE id = $1 FOR UPDATE', [id])
    if (!rows[0]) return null
    const r = await db.query(
      `UPDATE placas SET estado = 'inativa', cliente_id = NULL, ultimo_cliente = $2
        WHERE cliente_id = $1`, [id, rows[0].dados.businessName])
    await db.query('DELETE FROM clientes WHERE id = $1', [id])
    return r.rowCount
  })
  if (inativadas === null) return res.status(404).json({ erro: 'Cliente não encontrado' })
  res.json({ placasInativadas: inativadas })
})

export default router
