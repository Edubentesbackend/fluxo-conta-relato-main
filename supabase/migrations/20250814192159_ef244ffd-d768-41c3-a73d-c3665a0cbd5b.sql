-- Criar tabela de contas
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar enum para tipos de transação
CREATE TYPE public.transaction_type AS ENUM (
  'emprestimo',
  'devolucao', 
  'ajuste',
  'rateio',
  'correcao',
  'estorno',
  'transferencia_operacional'
);

-- Criar tabela de transações
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unique_identifier TEXT NOT NULL UNIQUE,
  source_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  destination_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  transaction_type public.transaction_type NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_accounts CHECK (source_account_id != destination_account_id)
);

-- Habilitar RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir acesso público para esta aplicação)
CREATE POLICY "Allow all access to accounts" ON public.accounts FOR ALL USING (true);
CREATE POLICY "Allow all access to transactions" ON public.transactions FOR ALL USING (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir algumas contas de exemplo
INSERT INTO public.accounts (name, description) VALUES
  ('Conta Caixa', 'Conta principal de caixa'),
  ('Conta Banco A', 'Conta corrente Banco A'),
  ('Conta Banco B', 'Conta corrente Banco B'),
  ('Conta Investimentos', 'Conta de investimentos'),
  ('Conta Fornecedores', 'Conta para pagamento de fornecedores');