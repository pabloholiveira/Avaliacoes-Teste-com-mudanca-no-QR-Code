// Importa os clientes da época do GitHub Pages (clientes/*.json) para o banco.
// O nome do arquivo vira o slug. Cliente que já existe no banco é pulado,
// nunca sobrescrito.
//
// Local:    npm run importar-clientes
// Railway:  railway run --service app npm run importar-clientes
import { readdir, readFile } from 'node:fs/promises'
import { validarCliente } from '../server/validacao.js'

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL
const { pool, migrar } = await import('../server/db.js')

const pasta = new URL('../clientes/', import.meta.url)
await migrar()

const arquivos = (await readdir(pasta)).filter(a => a.endsWith('.json')).sort()
for (const arquivo of arquivos) {
  const slug = arquivo.replace(/\.json$/, '')
  const dados = JSON.parse(await readFile(new URL(arquivo, pasta), 'utf8'))
  const v = validarCliente({ slug, dados })
  if (v.erro) { console.log(`✗ ${slug}: ${v.erro}`); continue }

  const { rowCount } = await pool.query(
    'INSERT INTO clientes (slug, dados) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING', [v.slug, v.dados])
  console.log(rowCount ? `✓ ${slug} importado` : `– ${slug} já existia, pulado`)
}

await pool.end()
