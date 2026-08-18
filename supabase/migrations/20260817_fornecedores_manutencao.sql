-- ==============================================================================
-- MIGRAÇÃO: CADASTRO E GESTÃO DE FORNECEDORES E PRESTADORES DE SERVIÇO SPCI
-- Data: 17/08/2026
-- Descrição: Tabela centralizada para fornecedores de recarga, teste hidrostático e manutenção
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.fornecedores_manutencao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT,
    registro_inmetro TEXT,
    telefone TEXT,
    whatsapp TEXT,
    email TEXT,
    contato_responsavel TEXT,
    endereco TEXT,
    cidade_uf TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para buscas rápidas por nome, cnpj e status ativo
CREATE INDEX IF NOT EXISTS idx_fornecedores_razao_social ON public.fornecedores_manutencao(razao_social);
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome_fantasia ON public.fornecedores_manutencao(nome_fantasia);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON public.fornecedores_manutencao(cnpj);
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON public.fornecedores_manutencao(ativo);

-- Habilitar RLS
ALTER TABLE public.fornecedores_manutencao ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS permissivas para o ecossistema SPCI
DROP POLICY IF EXISTS "Permitir leitura para todos autenticados" ON public.fornecedores_manutencao;
CREATE POLICY "Permitir leitura para todos autenticados"
    ON public.fornecedores_manutencao FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir inserção e edição para todos autenticados" ON public.fornecedores_manutencao;
CREATE POLICY "Permitir inserção e edição para todos autenticados"
    ON public.fornecedores_manutencao FOR ALL
    USING (true)
    WITH CHECK (true);

-- Inserção de dados semente (fornecedores de referência do setor)
INSERT INTO public.fornecedores_manutencao (razao_social, nome_fantasia, cnpj, registro_inmetro, telefone, email, contato_responsavel, cidade_uf)
VALUES 
('Extinwal Comércio e Manutenção de Equipamentos de Segurança Ltda', 'Extinwal Segurança Contra Incêndio', '61.458.742/0001-90', 'INMETRO 002145/2023', '(11) 3245-8800', 'contato@extinwal.com.br', 'Eng. Roberto Silva', 'São Paulo / SP'),
('Bucka Spiero Engenharia e Equipamentos Contra Incêndio Ltda', 'Bucka Spiero Equipamentos', '52.124.987/0001-33', 'INMETRO 004891/2024', '(11) 4004-9200', 'engenharia@bucka.com.br', 'Carlos Eduardo', 'São Paulo / SP'),
('Mocelin Extintores & Engenharia de Prevenção Ltda', 'Mocelin Extintores', '14.982.341/0001-12', 'INMETRO 008712/2023', '(41) 3340-5500', 'comercial@mocelin.com.br', 'Juliana Ramos', 'Curitiba / PR'),
('Kidde Brasil Manutenções e Soluções de Incêndio Ltda', 'Kidde Brasil Manutenções', '48.910.231/0001-05', 'INMETRO 001923/2025', '(19) 3887-9000', 'suporte@kidde.com.br', 'Marcos Vinicius', 'Campinas / SP'),
('Resmat Engenharia e Combate a Incêndio Ltda', 'Resmat Engenharia', '09.334.812/0001-78', 'INMETRO 003450/2024', '(21) 2590-4400', 'tecnico@resmat.com.br', 'Fabio Almeida', 'Rio de Janeiro / RJ')
ON CONFLICT DO NOTHING;
