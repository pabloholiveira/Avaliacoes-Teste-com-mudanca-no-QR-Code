# Como publicar no GitHub Pages — cópia de TESTE do QR code

> **Esta é a pasta de teste, não a de produção.** Ela publica em um repositório
> separado, e nada que for feito aqui chega ao site real nem às placas impressas.
>
> | | Teste (esta pasta) | Produção |
> |---|---|---|
> | Pasta | `~/Desktop/Landingpage_avl - Teste com alteração na função do QR Code` | `~/Desktop/Landingpage_avl` |
> | Repositório | `pabloholiveira/Avaliacoes-Teste-com-mudanca-no-QR-Code` | `pabloholiveira/Avaliacoes` |
> | Site | `https://pabloholiveira.github.io/Avaliacoes-Teste-com-mudanca-no-QR-Code/` | `https://pabloholiveira.github.io/Avaliacoes-Teste-com-mudanca-no-QR-Code/` |
> | Painel local | <http://localhost:8081/admin.html> | <http://localhost:8081/admin.html> |
>
> Antes de qualquer `git push`, confira com `git remote -v` que o destino é o
> `Avaliacoes-Teste-com-mudanca-no-QR-Code`. **Não imprima placas para clientes reais a partir desta pasta.**

Esta pasta já é um repositório git. Requisitos, todos já presentes nesta máquina:

| Ferramenta | Verificar com | Situação |
|---|---|---|
| git | `git --version` | 2.54.0 (Xcode Command Line Tools) |
| GitHub CLI | `gh auth status` | autenticado como `pabloholiveira` |
| Python 3 | `python3 --version` | usado para rodar o painel local |

---

## 1. Repositório e GitHub Pages — já feito

Em 24/09/2026 esta cópia foi desligada do repositório `Avaliacoes` e passou a
publicar em um repositório próprio, com o GitHub Pages servindo a branch
**main**, pasta **/ (root)**:

```
https://github.com/pabloholiveira/Avaliacoes-Teste-com-mudanca-no-QR-Code
https://pabloholiveira.github.io/Avaliacoes-Teste-com-mudanca-no-QR-Code/
```

O repositório precisa continuar **público**: o GitHub Pages em conta gratuita
não serve repositórios privados.

> **Não renomeie o repositório depois de testar QRs no celular.** A URL do
> Pages carrega o nome do repositório, maiúsculas inclusive, e o endereço antigo
> passa a dar 404 na hora — sem redirecionamento. (O rename de `avaliacoes`
> para `Avaliacoes` em 16/09/2026 fez exatamente isso na produção.)

## 2. Configurar o painel

1. Abra o `admin.html` (veja *Rodando o painel* mais abaixo).
2. Clique na engrenagem (**Configurações gerais**).
3. Cole `https://pabloholiveira.github.io/Avaliacoes-Teste-com-mudanca-no-QR-Code/` em **URL base da hospedagem** e salve.

Pronto. O aviso âmbar some, os links passam a apontar para o endereço real e o
botão **Baixar QR** é liberado.

---

## Rotina para cada cliente novo

1. **No painel:** preencher os dados → **Salvar alterações** → **Baixar JSON**.
2. **No Finder:** mover o arquivo baixado de `~/Downloads` para a pasta
   `clientes/` do projeto.
3. **No terminal:**

   ```bash
   cd ~/Desktop/"Landingpage_avl - Teste com alteração na função do QR Code"
   git add clientes/
   git commit -m "Adiciona cliente barbearia-do-ze"
   git push
   ```

4. Esperar ~1 minuto e **abrir no navegador**
   `https://pabloholiveira.github.io/Avaliacoes-Teste-com-mudanca-no-QR-Code/?c=SLUG`.
5. Só então **Baixar QR** e mandar a placa para impressão.

**Nunca imprima uma placa antes de conferir o link no navegador.** A placa é
física; o arquivo é de graça.

O passo 4 é rápido de checar: se o slug não estiver publicado, a página mostra
**"Página não encontrada"** em letras grandes. Ela nunca finge ser outro
negócio — foi feita assim justamente para esse erro não chegar impresso.

### Publicando vários clientes de uma vez

```bash
git add clientes/ && git commit -m "Adiciona 3 clientes" && git push
```

### Ver o que ainda não foi publicado

```bash
git status --short          # arquivos alterados ou novos
git log origin/main..main   # commits feitos mas não enviados
```

---

## Trabalhando em duas máquinas

Na máquina do parceiro, uma vez:

```bash
git clone https://github.com/pabloholiveira/Avaliacoes-Teste-com-mudanca-no-QR-Code.git
cd Avaliacoes-Teste-com-mudanca-no-QR-Code
python3 -m http.server 8081
```

Depois, <http://localhost:8081/admin.html> — e a **URL base da hospedagem**
precisa ser configurada ali também, na engrenagem: ela vive no navegador de cada
um, não no repositório.

Para poder dar `git push`, ele precisa ser colaborador do repositório:

```bash
gh api -X PUT repos/pabloholiveira/Avaliacoes-Teste-com-mudanca-no-QR-Code/collaborators/USUARIO-DELE
```

Sem isso ele clona e edita, mas não envia — teria que mandar o arquivo por fora.

**Antes de começar a editar, sempre `git pull`.** Dois `admin.html` editados em
paralelo dão conflito num arquivo de 1889 linhas, e resolver isso à mão não é
divertido. Combinem de mexer no painel um de cada vez.

---

## Duas coisas que você precisa saber

**Os arquivos em `clientes/` são públicos.** Qualquer pessoa pode abrir
`https://pabloholiveira.github.io/Avaliacoes-Teste-com-mudanca-no-QR-Code/clientes/barbearia-do-ze.json` e ler
o WhatsApp do cliente. Isso é inerente ao modelo sem backend: a landing precisa
buscar esse arquivo no navegador do visitante. Na prática é o mesmo número que o
negócio já divulga na fachada e no Google — mas é bom você saber antes de
prometer confidencialidade a alguém.

**O `admin.html` está no repositório, mas não no site.** Ele é versionado — é
assim que mais de uma pessoa trabalha no painel — e o `_config.yml` o mantém
fora do build do Pages, então `…github.io/Avaliacoes-Teste-com-mudanca-no-QR-Code/admin.html` responde 404.
O painel roda local, por `python3 -m http.server`, em cada máquina.

Como o repositório é público, o código do painel é legível por quem abrir o
GitHub. O que a exclusão evita é ele ficar *funcionando* como página no ar, à
mão de qualquer um que descubra o endereço. Se um dia isso deixar de importar,
apague a linha `admin.html` do `_config.yml`.

**A carteira de clientes não é compartilhada pelo git.** Ela vive no
`localStorage` do navegador de cada um. Duas pessoas com o mesmo repositório têm
duas listas independentes — para passar clientes de uma máquina para outra, use
**Exportar clientes** de um lado e **Importar backup** do outro.

---

## Rodando o painel localmente

```bash
cd ~/Desktop/"Landingpage_avl - Teste com alteração na função do QR Code"
python3 -m http.server 8081
```

Depois abra <http://localhost:8081/admin.html>. Para encerrar, `Ctrl+C`.

**Use a porta 8081 aqui, não a 8080.** A carteira de clientes e a URL base
ficam no `localStorage` do navegador, que é separado por endereço. Se as duas
pastas rodarem em `localhost:8080`, o painel de teste e o de produção passam a
ler e gravar os mesmos dados: a URL base de teste pode ir parar no painel de
produção e sair impressa numa placa real.

Precisa ser por servidor, não abrindo o arquivo direto: a landing usa `fetch`
para ler `clientes/*.json`, e o protocolo `file://` bloqueia isso.

---

## Backup

São duas coisas diferentes, e só uma delas o git protege:

| O quê | Onde vive | Protegido por |
|---|---|---|
| Landing, painel e JSONs dos clientes | nesta pasta | **git** — `git push` |
| Carteira do painel | `localStorage` do navegador | **só o export manual** |

A carteira é a lista que aparece na barra lateral do painel. Limpar os dados do
navegador ou trocar de máquina **apaga tudo** — e o git não vê nada disso.

Em **Configurações gerais → Backup da carteira**:

- **Exportar clientes** baixa `carteira-AAAA-MM-DD.json` com todos eles.
- **Importar backup** restaura o arquivo, mesclando com o que já existe
  (mostra quantos serão criados e quantos substituídos antes de confirmar).

Exporte depois de cadastrar cada cliente novo. O arquivo de backup **não** deve
ir para o GitHub — já está no `.gitignore`, junto com `qrcodes/`, os `*.bak.*` e
o `.DS_Store`.
