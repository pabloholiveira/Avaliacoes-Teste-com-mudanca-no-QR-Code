import express from 'express'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'
import auth, { exigirLogin } from './rotas/auth.js'
import publico from './rotas/publico.js'
import clientes from './rotas/clientes.js'
import placas, { lotes } from './rotas/placas.js'

const PUBLICO = fileURLToPath(new URL('../public', import.meta.url))

// Endereço que vai dentro do QR. Sem URL_PUBLICA, usa o endereço pelo qual o
// painel foi aberto — serve para testar, nunca para imprimir.
function urlPublica(req) {
  const definida = (process.env.URL_PUBLICA || '').trim().replace(/\/+$/, '')
  return definida || `${req.protocol}://${req.get('host')}`
}

export function criarApp() {
  const app = express()

  // A Railway põe um proxy na frente: sem isto req.ip seria o do proxy (o
  // limite de tentativas travaria todo mundo junto) e req.protocol seria http.
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // O painel embute a landing num iframe (preview); ninguém de fora pode.
      'X-Frame-Options': 'SAMEORIGIN'
    })
    next()
  })

  app.use(express.json({ limit: '100kb' }))

  app.get('/api/saude', async (req, res) => {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  })

  app.use('/api', auth)
  app.use('/api/publico', publico)

  // Daqui para baixo, tudo exige login.
  const privado = express.Router()
  privado.use(exigirLogin)
  privado.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next() })

  privado.get('/config', (req, res) => {
    res.json({
      urlPublica: urlPublica(req),
      qrDefinitivo: process.env.QR_DEFINITIVO === 'true',
      usuario: req.usuario.usuario
    })
  })

  privado.use('/clientes', clientes)
  privado.use('/lotes', lotes)
  privado.use('/placas', placas)

  // Backup manual de tudo, para guardar fora da Railway.
  privado.get('/exportar', async (req, res) => {
    const [c, l, p] = await Promise.all([
      pool.query('SELECT id, slug, dados, criado_em, atualizado_em FROM clientes ORDER BY id'),
      pool.query('SELECT * FROM lotes ORDER BY id'),
      pool.query('SELECT * FROM placas ORDER BY lote_id, codigo')
    ])
    const dia = new Date().toISOString().slice(0, 10)
    res.set('Content-Disposition', `attachment; filename="backup-${dia}.json"`)
    res.json({ formato: 'avl-backup', versao: 2, exportadoEm: new Date().toISOString(),
      clientes: c.rows, lotes: l.rows, placas: p.rows })
  })

  app.use('/api', privado)
  app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada' }))

  // HTML sempre revalidado: uma versão nova do painel vale no próximo acesso.
  app.use(express.static(PUBLICO, {
    extensions: ['html'],
    setHeaders(res, caminho) {
      if (caminho.endsWith('.html')) res.set('Cache-Control', 'no-cache')
    }
  }))

  // Express 5 entrega aqui os erros das rotas async.
  app.use((erro, req, res, next) => {
    console.error(erro)
    if (res.headersSent) return next(erro)
    res.status(500).json({ erro: 'Erro interno. Tente de novo.' })
  })

  return app
}
