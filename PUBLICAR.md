# Sistema de avaliações com placas — cópia de TESTE (Railway)

> **Esta é a pasta de teste, não a de produção.** Ela publica num repositório e
> num projeto da Railway separados; nada daqui chega ao site real
> (`pabloholiveira/Avaliacoes`, GitHub Pages) nem às placas já impressas.
> **Não imprima placas para clientes reais a partir daqui.**

| | Teste (esta pasta) | Produção |
|---|---|---|
| Pasta | `~/Desktop/Landingpage_avl - Teste com alteração na função do QR Code` | `~/Desktop/Landingpage_avl` |
| Repositório | `pabloholiveira/Avaliacoes-Teste-com-mudanca-no-QR-Code` | `pabloholiveira/Avaliacoes` |
| Hospedagem | Railway, projeto `avaliacoes-teste` | GitHub Pages |

---

## Como funciona

Um servidor Express com Postgres, os dois na Railway, no mesmo endereço:

| Endereço | O quê |
|---|---|
| `/?p=K7M2QX` | O que o QR da placa abre. Mostra a página do cliente, "Placa ainda não ativada" ou "Página não encontrada". |
| `/?c=slug` | Página de um cliente sem placa, para conferir. Nunca vai em placa. |
| `/admin/` | Painel, com login. Funciona no celular. |
| `/api/...` | O que a landing e o painel consultam. |

Clientes, lotes e placas ficam **no banco**, não em arquivos. Salvar ou vincular
no painel vale na hora para todo mundo — sem baixar JSON, sem `git push`.

### Os três estados da placa

| Estado | Quando | O QR mostra |
|---|---|---|
| **Livre** | Recém-gerada, ou devolvida às nossas mãos | "Placa ainda não ativada" |
| **Ativa** | Vinculada a um cliente | A página do cliente |
| **Inativa** | O cliente saiu (excluído ou desvinculada com "Desativar") | "Página não encontrada" |

Uma placa inativa **não pode** ser vinculada a outro cliente: ela pode ainda
estar pendurada na loja do anterior, e quem escaneasse lá cairia na página de
outro negócio. Ela só volta a livre por **Liberar placa…**, na aba Placas,
quando a placa física estiver com vocês.

---

## Rotina

**Imprimir um lote** — aba **Placas** → quantidade → **Gerar lote** →
**Baixar QRs do lote (.zip)**. Cada PNG tem o QR (1024px, correção nível Q) e o
código escrito embaixo. O zip traz também um `placas.csv`.

**Ativar uma placa num cliente** — aba **Clientes** → abrir (ou criar e salvar)
o cliente → **Ler QR da placa** → apontar a câmera do celular para a placa →
**Vincular**. Sem câmera: **Ler de uma foto**, ou digitar o código de 6
caracteres escrito embaixo do QR.

**Cliente saiu** — no cliente, o **×** na placa → **Desativar** (a placa ficou
na loja) ou **Voltar para livre** (a placa voltou para vocês).

---

## Antes do primeiro lote de verdade

1. **Domínio próprio.** O endereço que vai dentro do QR fica gravado na placa
   para sempre. Registre um domínio (ex.: registro.br), aponte para a Railway
   (Settings do serviço → Networking → Custom Domain) e ponha em
   `URL_PUBLICA`.
2. **`QR_DEFINITIVO=true`.** Enquanto não estiver, todo PNG sai com a faixa
   vermelha **"TESTE — NÃO IMPRIMIR"**.
3. Isto sai da cópia de teste: a versão aprovada vai para o repositório e o
   projeto de produção.

---

## Variáveis na Railway (serviço `app`)

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência; sobrevive a troca de senha do banco) |
| `DATABASE_PUBLIC_URL` | `${{Postgres.DATABASE_PUBLIC_URL}}` — só para os scripts rodados do seu computador |
| `JWT_SECRET` | Texto aleatório longo. **Trocar derruba todos os logins na hora.** |
| `URL_PUBLICA` | Endereço dentro do QR, sem barra no fim |
| `QR_DEFINITIVO` | `false` até o domínio definitivo |

O banco é criado/atualizado sozinho a cada início do servidor (`server/schema.sql`).

---

## Login

É um login só, compartilhado por você e pelo Henrique. Criar, ou trocar a
senha dele, do seu computador:

```bash
cd ~/Desktop/"Landingpage_avl - Teste com alteração na função do QR Code"
railway run --service app npm run criar-usuario
```

O script pergunta usuário e senha no terminal (a senha não aparece enquanto
digita). Não existe tela de cadastro no painel, de propósito.

O login vale 30 dias em cada aparelho. Se um celular for perdido: troque a
senha com o mesmo comando **e** troque o `JWT_SECRET` na Railway — só a troca
do segredo derruba na hora quem já estava logado.

Como o login é compartilhado, o sistema não sabe *quem* de vocês fez cada
alteração.

---

## Publicar mudanças no código

A Railway está ligada ao GitHub: **`git push` na `main` publica sozinho**,
em 1–2 minutos. Acompanhe em `railway logs --service app` ou no painel da Railway.

## Rodar local

Requer o Postgres local (`brew services start postgresql@16`).

```bash
cd ~/Desktop/"Landingpage_avl - Teste com alteração na função do QR Code"
createdb avaliacoes_teste          # só na primeira vez
cp .env.example .env               # só na primeira vez; preencha o JWT_SECRET
npm install
npm run criar-usuario              # login local, separado do da Railway
npm run dev
```

Painel em <http://localhost:8081/admin/>. Com `URL_PUBLICA` vazio o endereço é
local, e o painel **bloqueia** o download de QRs — de propósito.

## Backup

**Configurações (engrenagem) → Exportar tudo** baixa clientes, lotes e placas
num JSON. Guarde fora da Railway de tempos em tempos; o arquivo já está no
`.gitignore` e não deve ir para o GitHub.

## O que é público

A landing só recebe os dados de **um** cliente por vez, pelo código da placa ou
pelo slug — nada de listas. Os códigos não seguem sequência e têm 887 milhões de
combinações; a API ainda limita as consultas por IP. O WhatsApp do cliente
aparece na página dele, como já aparece na fachada e no Google.
