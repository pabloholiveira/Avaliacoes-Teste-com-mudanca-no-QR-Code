import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { pool } from '../db.js'

// 30 dias: o painel é usado no celular, em campo; relogar toda semana cansa.
// O preço é que desativar o usuário só vale quando o token vencer — para
// derrubar todo mundo na hora, troque o JWT_SECRET na Railway.
const VALIDADE = '30d'

const router = Router()

// O painel fica na internet: sem isto, dá para testar senhas à vontade.
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Espere 15 minutos.' }
})

router.post('/login', limiteLogin, async (req, res) => {
  const { usuario, senha } = req.body || {}
  if (!usuario || !senha) return res.status(400).json({ erro: 'Informe usuário e senha.' })

  const { rows } = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [String(usuario).trim()])
  const u = rows[0]

  // Mesma resposta para usuário inexistente, desativado ou senha errada.
  if (!u || !u.ativo || !(await bcrypt.compare(String(senha), u.senha_hash))) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' })
  }

  const token = jwt.sign({ id: u.id, usuario: u.usuario }, process.env.JWT_SECRET, { expiresIn: VALIDADE })
  res.json({ token, usuario: u.usuario })
})

export function exigirLogin(req, res, next) {
  const cabecalho = req.headers.authorization || ''
  if (!cabecalho.startsWith('Bearer ')) return res.status(401).json({ erro: 'Não autenticado' })
  try {
    req.usuario = jwt.verify(cabecalho.slice(7), process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ erro: 'Sessão expirada. Entre de novo.' })
  }
}

export default router
