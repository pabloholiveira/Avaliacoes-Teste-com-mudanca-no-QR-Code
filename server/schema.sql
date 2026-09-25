-- Roda inteiro a cada início do servidor (server/db.js). Tudo aqui precisa ser
-- idempotente: CREATE ... IF NOT EXISTS, nunca DROP. Mudança de coluna em
-- tabela que já tem dados entra como ALTER ... IF NOT EXISTS no fim do arquivo.

CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  usuario     TEXT NOT NULL UNIQUE,
  senha_hash  TEXT NOT NULL,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- `dados` guarda os campos da página no mesmo formato que a landing lê
-- (businessName, headline, lede...). Coluna por campo não traria nada: o
-- servidor nunca filtra por eles, só entrega o objeto inteiro.
CREATE TABLE IF NOT EXISTS clientes (
  id             SERIAL PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{1,60}$'),
  dados          JSONB NOT NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lotes (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  quantidade  INTEGER NOT NULL CHECK (quantidade > 0),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Três estados:
--   livre   — nunca usada, ou devolvida às nossas mãos; pode ser vinculada.
--   ativa   — vinculada a um cliente; o QR abre a página dele.
--   inativa — o cliente saiu, mas a placa pode continuar pendurada na loja.
--             Mostra "Página não encontrada" e NÃO pode ser vinculada: só
--             volta a livre por ação manual, quando a placa física voltar.
-- A placa aponta para clientes.id, não para o slug: renomear o slug de um
-- cliente não quebra as placas dele.
CREATE TABLE IF NOT EXISTS placas (
  codigo          CHAR(6) PRIMARY KEY CHECK (codigo ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$'),
  lote_id         INTEGER NOT NULL REFERENCES lotes(id),
  estado          TEXT NOT NULL DEFAULT 'livre' CHECK (estado IN ('livre', 'ativa', 'inativa')),
  cliente_id      INTEGER REFERENCES clientes(id),
  -- Nome do último cliente, para a lista mostrar de onde veio uma placa inativa.
  ultimo_cliente  TEXT,
  vinculada_em    TIMESTAMPTZ,
  criada_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT placa_ativa_tem_cliente CHECK ((estado = 'ativa') = (cliente_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS placas_cliente_idx ON placas (cliente_id);
CREATE INDEX IF NOT EXISTS placas_lote_idx ON placas (lote_id);
