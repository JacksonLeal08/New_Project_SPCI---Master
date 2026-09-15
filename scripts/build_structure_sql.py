import os
import re

backup_path = r'C:\Users\jacks\OneDrive\Documentos\Jackson Leal\ANTIGRAVITY_PROJECTS\db_cluster-14-09-2026@04-04-37.backup\db_cluster-14-09-2026@04-04-37.backup'
output_file = r'C:\Users\jacks\OneDrive\Documentos\Jackson Leal\ANTIGRAVITY_PROJECTS\New_Project_SPCI---Master\supabase\01_ESTRUTURA_E_USUARIOS.sql'

with open(backup_path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

def extract_copy_data(table_name):
    prefix = f"COPY {table_name} ("
    start_idx = text.find(prefix)
    if start_idx == -1:
        return None
    end_of_copy_line = text.find("\n", start_idx)
    header_line = text[start_idx:end_of_copy_line]
    col_str = header_line[header_line.find("(")+1 : header_line.find(")")]
    cols = [c.strip() for c in col_str.split(",")]
    term_idx = text.find("\n\\.", end_of_copy_line)
    if term_idx == -1:
        return None
    data_block = text[end_of_copy_line + 1 : term_idx]
    rows = [r.strip() for r in data_block.split("\n") if r.strip()]
    return {"cols": cols, "rows": rows}

def format_val(val, col_name):
    if val == r'\N' or val == '':
        return 'NULL'
    # Se for uma imagem base64 gigante em logo_url, colocar NULL no script inicial para não estourar o limite do editor
    if col_name in ['logo_url', 'photo_url'] and len(val) > 1000:
        return 'NULL'
    escaped = val.replace("'", "''")
    return f"'{escaped}'"

tables_sql = re.findall(r'CREATE TABLE public\.[^;]+;', text, re.DOTALL)
views_sql = re.findall(r'CREATE VIEW public\.[^;]+;', text, re.DOTALL)
functions_sql = re.findall(r'CREATE FUNCTION public\.[a-zA-Z0-9_]+\s*\(.*?\)\s+RETURNS.*?\$\$;', text, re.DOTALL)
indexes_sql = re.findall(r'CREATE (?:UNIQUE )?INDEX [^;]+ ON public\.[^;]+;', text, re.DOTALL)
triggers_sql = re.findall(r'CREATE TRIGGER [^;]+ ON public\.[^;]+;', text, re.DOTALL)
policies_sql = re.findall(r'CREATE POLICY [^;]+ ON public\.[^;]+;', text, re.DOTALL)

# Apenas as tabelas estruturais leves necessárias para subir o banco e habilitar o login
STRUCTURE_DATA_TABLES = [
    'auth.users',
    'auth.identities',
    'public.modulos',
    'public.permissoes_modulos',
    'public.profiles',
    'public.usuarios',
    'public.modelos_extintores',
    'public.checklists_ativos',
    'public.fornecedores_manutencao',
    'public.contratos'
]

with open(output_file, 'w', encoding='utf-8') as out:
    out.write("-- ==============================================================================\n")
    out.write("-- SPCI MASTER: ESTRUTURA E USUÁRIOS (PASSO 1 - ULTRA LEVE)\n")
    out.write("-- Cole este script no SQL Editor do seu novo Supabase e clique em RUN.\n")
    out.write("-- ==============================================================================\n\n")

    out.write("CREATE EXTENSION IF NOT EXISTS pgcrypto;\n")
    out.write("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n\n")

    # Enums
    out.write("-- 1. ENUMS E TIPOS\n")
    out.write("""DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('Desenvolvedor', 'Administrador', 'Usuário');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_estoque_enum') THEN
        CREATE TYPE public.status_estoque_enum AS ENUM ('ESTOQUE APLICAÇÃO', 'ESTOQUE MANUTENÇÃO', 'APLICADO', 'CONDENADO');
    END IF;
END $$;\n\n""")

    # Tabelas
    out.write("-- 2. TABELAS PÚBLICAS\n")
    for t_sql in tables_sql:
        t_clean = re.sub(r'^CREATE TABLE public\.', 'CREATE TABLE IF NOT EXISTS public.', t_sql.strip(), flags=re.IGNORECASE)
        out.write(t_clean + "\n\n")

    # Funções
    out.write("-- 3. FUNÇÕES DO SISTEMA SPCI\n")
    for f_sql in functions_sql:
        f_clean = re.sub(r'^CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION', f_sql.strip(), flags=re.IGNORECASE)
        out.write(f_clean + "\n\n")

    # Views
    out.write("-- 4. VIEWS PÚBLICAS\n")
    for v_sql in views_sql:
        v_clean = re.sub(r'^CREATE VIEW', 'CREATE OR REPLACE VIEW', v_sql.strip(), flags=re.IGNORECASE)
        out.write(v_clean + "\n\n")

    # Índices
    out.write("-- 5. ÍNDICES\n")
    for idx in indexes_sql:
        idx_clean = re.sub(r'^CREATE (UNIQUE )?INDEX ', r'CREATE \1INDEX IF NOT EXISTS ', idx.strip(), flags=re.IGNORECASE)
        out.write(idx_clean + "\n")
    out.write("\n")

    # RLS Habilitação
    out.write("-- 6. ROW LEVEL SECURITY (RLS)\n")
    for t_sql in tables_sql:
        m = re.match(r'CREATE TABLE (?:IF NOT EXISTS )?public\.([^\s(]+)', t_sql, re.IGNORECASE)
        if m:
            t_name = m.group(1)
            out.write(f"ALTER TABLE public.{t_name} ENABLE ROW LEVEL SECURITY;\n")
    out.write("\n")

    # Políticas RLS
    out.write("-- 7. POLÍTICAS DE ACESSO (RLS POLICIES)\n")
    for pol in policies_sql:
        m = re.match(r'CREATE POLICY "([^"]+)" ON public\.([^\s;]+)', pol.strip(), re.IGNORECASE)
        if m:
            pol_name = m.group(1)
            tbl_name = m.group(2)
            out.write(f'DROP POLICY IF EXISTS "{pol_name}" ON public.{tbl_name};\n')
        out.write(pol.strip() + "\n\n")

    # Triggers
    out.write("-- 8. TRIGGERS AUTOMÁTICOS\n")
    for trg in triggers_sql:
        m = re.match(r'CREATE TRIGGER ([^\s]+) .* ON public\.([^\s;]+)', trg.strip(), re.IGNORECASE)
        if m:
            trg_name = m.group(1)
            tbl_name = m.group(2)
            out.write(f"DROP TRIGGER IF EXISTS {trg_name} ON public.{tbl_name};\n")
        out.write(trg.strip() + "\n\n")

    # Storage Bucket fotos-extintores
    out.write("-- 9. BUCKET DE FOTOS NO SUPABASE STORAGE\n")
    out.write("""INSERT INTO storage.buckets (id, name, public) 
VALUES ('fotos-extintores', 'fotos-extintores', true) 
ON CONFLICT (id) DO NOTHING;\n\n""")

    # 10. CARGA DE USUÁRIOS E TABELAS ESTRUTURAIS
    out.write("-- ==============================================================================\n")
    out.write("-- 10. USUÁRIOS DE ACESSO E TABELAS BASE\n")
    out.write("-- ==============================================================================\n")
    out.write("SET session_replication_role = replica; -- Desativa validações de FK temporariamente durante a carga\n\n")

    for t_name in STRUCTURE_DATA_TABLES:
        info = extract_copy_data(t_name)
        if not info or not info['rows']:
            continue
        
        cols = info['cols']
        rows = info['rows']
        cols_str = ', '.join([f'"{c}"' for c in cols])
        out.write(f"-- Inserindo {len(rows)} registros em {t_name}...\n")
        
        batch_size = 50
        for b in range(0, len(rows), batch_size):
            chunk = rows[b:b+batch_size]
            val_rows = []
            for r in chunk:
                parts = r.split('\t')
                vals = [format_val(parts[idx] if idx < len(parts) else r'\N', cols[idx]) for idx in range(len(cols))]
                val_rows.append(f"({', '.join(vals)})")
            
            insert_stmt = f"INSERT INTO {t_name} ({cols_str}) VALUES\n" + ",\n".join(val_rows) + "\nON CONFLICT DO NOTHING;\n\n"
            out.write(insert_stmt)

    out.write("SET session_replication_role = DEFAULT; -- Reativa validação de FK e triggers\n\n")
    out.write("-- FIM DO SCRIPT DE ESTRUTURA E USUÁRIOS\n")

print(f"Sucesso! Gerado arquivo: {output_file}")
