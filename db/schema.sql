-- KIGELO Financeiro — Schema PostgreSQL
-- Execute com: psql $DATABASE_URL -f db/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','FUNC')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operators (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('SAIDA','CUSTO')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, type)
);

-- Um lançamento confirmado é IMUTÁVEL. Correções só via estorno (nova linha).
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ENTRADA','SAIDA','CUSTO')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method_id INTEGER REFERENCES payment_methods(id),
  operator_id INTEGER REFERENCES operators(id),
  installments INTEGER,
  category_id INTEGER REFERENCES categories(id),
  supplier TEXT,
  invoice_number TEXT,
  description TEXT,
  observation TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','ESTORNADO')),
  reversal_reason TEXT,
  reversed_by INTEGER REFERENCES users(id),
  reversed_at TIMESTAMPTZ,
  month_closed BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  transaction_id INTEGER REFERENCES transactions(id),
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_closings (
  id SERIAL PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  closed_by INTEGER REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  reopened_by INTEGER REFERENCES users(id),
  reopened_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO','FECHADO')),
  UNIQUE(month, year)
);

-- seeds
INSERT INTO payment_methods (name) VALUES ('Dinheiro'),('PIX'),('Débito'),('Crédito') ON CONFLICT DO NOTHING;
INSERT INTO operators (name) VALUES ('Stone'),('Cielo'),('Rede'),('PagSeguro'),('Mercado Pago'),('Outra') ON CONFLICT DO NOTHING;
INSERT INTO categories (name, type) VALUES
 ('Compra','SAIDA'),('Fornecedor','SAIDA'),('Manutenção','SAIDA'),('Transporte','SAIDA'),
 ('Material','SAIDA'),('Funcionários','SAIDA'),('Aluguel','SAIDA'),('Contas','SAIDA'),
 ('Serviços','SAIDA'),('Despesas gerais','SAIDA'),('Outros','SAIDA')
ON CONFLICT DO NOTHING;
