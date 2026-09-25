// Cria um login do painel, ou troca a senha de um que já existe.
//
// Local:    npm run criar-usuario
// Railway:  railway ssh --service app npm run criar-usuario
//
// Pergunta usuário e senha no terminal (a senha não aparece enquanto digita)
// e grava só o hash. Não existe tela de cadastro no painel de propósito.
import readline from 'node:readline'
import bcrypt from 'bcryptjs'

// Na Railway roda DENTRO do servidor (railway ssh): o banco não tem endereço
// público, de propósito, e só é alcançável de lá.
const { pool, migrar } = await import('../server/db.js')

function perguntar(texto, oculto = false) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (oculto) {
      // Só o prompt é escrito; o que for digitado não ecoa.
      rl._writeToOutput = s => { if (s.includes(texto)) rl.output.write(s) }
    }
    rl.question(texto, resposta => {
      rl.close()
      if (oculto) process.stdout.write('\n')
      resolve(resposta.trim())
    })
  })
}

await migrar()

const usuario = await perguntar('Usuário: ')
if (!/^[a-zA-Z0-9._-]{3,40}$/.test(usuario)) {
  console.error('Usuário inválido: 3 a 40 letras, números, ponto, hífen ou sublinhado.')
  process.exit(1)
}

const senha = await perguntar('Senha (mínimo 10 caracteres): ', true)
if (senha.length < 10) { console.error('Senha curta demais.'); process.exit(1) }
const confirmacao = await perguntar('Repita a senha: ', true)
if (senha !== confirmacao) { console.error('As senhas não conferem.'); process.exit(1) }

const hash = await bcrypt.hash(senha, 12)
const { rows } = await pool.query(
  `INSERT INTO usuarios (usuario, senha_hash) VALUES ($1, $2)
   ON CONFLICT (usuario) DO UPDATE SET senha_hash = EXCLUDED.senha_hash, ativo = true
   RETURNING (xmax = 0) AS criado`, [usuario, hash])

console.log(rows[0].criado ? `Usuário "${usuario}" criado.` : `Senha de "${usuario}" atualizada.`)
await pool.end()
