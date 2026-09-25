import { readFile } from 'node:fs/promises'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL não definida')

// O Postgres da Railway exige SSL quando acessado pelo endereço público
// (*.proxy.rlwy.net); o endereço interno e o banco local não usam.
const precisaSsl = /rlwy\.net|railway\.app/.test(url) && !/\.railway\.internal/.test(url)

export const pool = new pg.Pool({
  connectionString: url,
  ssl: precisaSsl ? { rejectUnauthorized: false } : undefined
})

// Cria/atualiza as tabelas a cada início. Na Railway o deploy vem do git push;
// assim nunca sobe um servidor novo sobre um banco sem as tabelas dele.
export async function migrar() {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
  await pool.query(sql)
}

export async function transacao(fn) {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const resultado = await fn(cliente)
    await cliente.query('COMMIT')
    return resultado
  } catch (erro) {
    await cliente.query('ROLLBACK')
    throw erro
  } finally {
    cliente.release()
  }
}
