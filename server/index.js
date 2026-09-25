import { criarApp } from './app.js'
import { migrar } from './db.js'

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET ausente ou curto demais (mínimo 32 caracteres).')
  process.exit(1)
}

await migrar()

const porta = Number(process.env.PORT) || 3000
criarApp().listen(porta, () => console.log(`Servidor em http://localhost:${porta}`))
