import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { pool } from '../db.js'
import { RE_SLUG, normalizarCodigo } from '../validacao.js'

// O que a landing (index.html) consulta, sem login. Devolve só os campos da
// página de UM cliente por vez — nunca listas.
const router = Router()

// Folgado para gente de verdade; trava quem tenta varrer códigos.
router.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { erro: 'Muitas requisições.' }
}))

// Ativar uma placa precisa valer no próximo scan, não em 10 minutos.
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next() })

// Placa livre → { estado: 'livre' }. Inativa e inexistente dão o mesmo 404:
// a landing mostra "Página não encontrada" nos dois casos.
router.get('/placa/:codigo', async (req, res) => {
  const codigo = normalizarCodigo(req.params.codigo)
  if (!codigo) return res.status(404).json({ erro: 'Não encontrada' })

  const { rows } = await pool.query(
    `SELECT p.estado, c.dados
       FROM placas p LEFT JOIN clientes c ON c.id = p.cliente_id
      WHERE p.codigo = $1`, [codigo])
  const placa = rows[0]

  if (!placa || placa.estado === 'inativa') return res.status(404).json({ erro: 'Não encontrada' })
  if (placa.estado === 'livre') return res.json({ estado: 'livre' })
  res.json({ estado: 'ativa', cliente: placa.dados })
})

// Link direto ?c=<slug>: para testar a página de um cliente sem placa.
router.get('/cliente/:slug', async (req, res) => {
  const slug = req.params.slug
  if (!RE_SLUG.test(slug)) return res.status(404).json({ erro: 'Não encontrado' })

  const { rows } = await pool.query('SELECT dados FROM clientes WHERE slug = $1', [slug])
  if (!rows[0]) return res.status(404).json({ erro: 'Não encontrado' })
  res.json({ cliente: rows[0].dados })
})

export default router
