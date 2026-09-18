-- =========================================================================================
-- SPCI MASTER: MIGRATION DE GESTÃO DE CONTRATOS (SITES), GOVERNANÇA E CONTROLE DE ACESSO
-- Objetivo: Estruturar colunas corporativas, dados de emergência (CECOM), GPS e integridade referencial
-- Data: 17/09/2026
-- =========================================================================================

-- 1. EXPANSÃO DA TABELA CONTRATOS
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS codigo_slug TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS razao_social TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS cidade_uf TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS telefone_emergencia TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS email_gestor TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS whatsapp_gestor TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ATIVO';

-- 2. DEDUPLICAÇÃO E NORMALIZAÇÃO DE SLUGS BASE (SALOBO E ONÇA PUMA)
UPDATE public.contratos
SET 
  codigo_slug = 'SALOBO',
  razao_social = 'VALE S.A. - PROJETO SALOBO',
  cidade_uf = 'Marabá / Parauapebas - PA',
  telefone_emergencia = '(94) 3328-7000',
  email_gestor = 'cecom.salobo@vale.com',
  latitude = -5.8117,
  longitude = -50.5369,
  status = 'ATIVO',
  ativo = true
WHERE UPPER(nome) = 'SALOBO' AND (codigo_slug IS NULL OR codigo_slug = '');

UPDATE public.contratos
SET 
  codigo_slug = 'ONCA_PUMA',
  razao_social = 'VALE S.A. - PROJETO ONÇA PUMA',
  cidade_uf = 'Ourilândia do Norte - PA',
  telefone_emergencia = '(94) 3334-9000',
  email_gestor = 'cecom.oncapuma@vale.com',
  latitude = -6.5381,
  longitude = -51.0583,
  status = 'ATIVO',
  ativo = true
WHERE (UPPER(nome) = 'ONÇA PUMA' OR UPPER(nome) = 'ONCA PUMA') AND (codigo_slug IS NULL OR codigo_slug = '');

-- Preencher slugs de outros contratos cadastrados
UPDATE public.contratos
SET codigo_slug = UPPER(REGEXP_REPLACE(nome, '\s+', '_', 'g'))
WHERE codigo_slug IS NULL OR codigo_slug = '';

-- Criar índice para busca rápida por slug
CREATE INDEX IF NOT EXISTS idx_contratos_slug ON public.contratos(codigo_slug);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON public.contratos(status);

-- 3. TABELA DE RELACIONAMENTO MULTI-CONTRATOS DE USUÁRIOS (RBAC MULTI-SITE)
CREATE TABLE IF NOT EXISTS public.usuario_contratos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  usuario_id TEXT NOT NULL,
  contrato_id TEXT NOT NULL,
  contrato_nome TEXT,
  is_primary BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_usuario_contrato UNIQUE (usuario_id, contrato_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_contratos_user ON public.usuario_contratos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_contratos_contrato ON public.usuario_contratos(contrato_id);

-- 4. ADICIONAR CAMPOS DE PERFIL DE USUÁRIO (MATRÍCULA, PREFERÊNCIAS)
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS matricula TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS cargo_funcao TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS tema_preferido TEXT DEFAULT 'sistema';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS alertas_sonoros BOOLEAN DEFAULT true;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS volume_alertas NUMERIC DEFAULT 0.8;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS site_padrao TEXT;

SELECT 'Migration de Gestão de Contratos e Usuários concluída com sucesso!' AS resultado;
