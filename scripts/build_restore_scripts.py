import os
import re

backup_path = r'C:\Users\jacks\OneDrive\Documentos\Jackson Leal\ANTIGRAVITY_PROJECTS\db_cluster-14-09-2026@04-04-37.backup\db_cluster-14-09-2026@04-04-37.backup'
output_dir = r'C:\Users\jacks\OneDrive\Documentos\Jackson Leal\ANTIGRAVITY_PROJECTS\New_Project_SPCI---Master\supabase'

os.makedirs(output_dir, exist_ok=True)

with open(backup_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print(f"Total de linhas lidas: {len(lines)}")

# Tabelas a incluir na carga de dados (ignorar logs_auditoria gigantes para manter o script leve e rápido)
DATA_TABLES = [
    'auth.users',
    'auth.identities',
    'public.modulos',
    'public.locais',
    'public.sub_locais',
    'public.modelos_extintores',
    'public.contratos',
    'public.checklists_ativos',
    'public.fornecedores_manutencao',
    'public.usuarios',
    'public.profiles',
    'public.permissoes_modulos',
    'public.lotes_manutencao',
    'public.itens_lote_manutencao',
    'public.assets',
    'public.ativos_extintores',
    'public.cadastro_extintores',
    'public.inspecoes',
    'public.inspecoes_realizadas',
    'public.ativo_movimentacoes',
    'public.historico_movimentacoes_ativos',
    'public.historico_localizacao_ativo',
    'public.shared_sessions'
]

# 1. Extrair DDL da seção pós \connect postgres
connect_idx = -1
for i, line in enumerate(lines):
    if line.strip() == r'\connect postgres':
        connect_idx = i
        break

if connect_idx == -1:
    connect_idx = 0

ddl_lines = []
copy_data = {}
current_copy = None
current_cols = None

for i in range(connect_idx, len(lines)):
    line = lines[i]
    
    # Identificar início de COPY
    if line.startswith('COPY '):
        match = re.match(r'COPY\s+([^\s(]+)\s*\(([^)]+)\)\s+FROM\s+stdin;', line)
        if match:
            table_name = match.group(1)
            cols = [c.strip() for c in match.group(2).split(',')]
            if table_name in DATA_TABLES:
                current_copy = table_name
                current_cols = cols
                copy_data[current_copy] = {'cols': cols, 'rows': []}
            else:
                current_copy = None
        continue
    
    # Identificar fim de COPY
    if line.strip() == r'\.':
        current_copy = None
        continue
        
    if current_copy:
        copy_data[current_copy]['rows'].append(line.rstrip('\r\n'))
        continue

    # Filtrar comandos específicos de psql
    if line.startswith('\\'):
        continue
    if 'CREATE ROLE ' in line or 'ALTER ROLE ' in line:
        continue
    if line.startswith('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin'):
        continue
    if line.startswith('GRANT ') and 'TO supabase_admin' in line:
        continue
    if line.startswith('CREATE SCHEMA ') and ('auth' in line or 'storage' in line or 'extensions' in line):
        continue
        
    ddl_lines.append(line)

# Salvar DDL
ddl_file = os.path.join(output_dir, '01_ESTRUTURA_COMPLETA_NOVO_BANCO.sql')
with open(ddl_file, 'w', encoding='utf-8') as f:
    f.write("-- ==============================================================================\n")
    f.write("-- SPCI MASTER: ESTRUTURA COMPLETA (DDL, TIPOS, FUNÇÕES, VIEWS, TRIGGERS E RLS)\n")
    f.write("-- Execute este script no SQL Editor do seu novo projeto Supabase.\n")
    f.write("-- ==============================================================================\n\n")
    f.write("CREATE EXTENSION IF NOT EXISTS pgcrypto;\n")
    f.write("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n\n")
    f.writelines(ddl_lines)

print(f"Arquivo de DDL gerado: {ddl_file} ({len(ddl_lines)} linhas)")

# Converter COPY em INSERT INTO
def format_val(val):
    if val == r'\N' or val == '':
        return 'NULL'
    # Escape single quotes
    escaped = val.replace("'", "''")
    return f"'{escaped}'"

data_file = os.path.join(output_dir, '02_DADOS_E_USUARIOS.sql')
with open(data_file, 'w', encoding='utf-8') as f:
    f.write("-- ==============================================================================\n")
    f.write("-- SPCI MASTER: RESTAURAÇÃO DE DADOS, ATIVOS E USUÁRIOS\n")
    f.write("-- Execute este script no SQL Editor do seu novo projeto Supabase APÓS o script 01.\n")
    f.write("-- ==============================================================================\n\n")
    f.write("SET session_replication_role = replica; -- Desativa temporariamente validações de FK e triggers durante a carga\n\n")
    
    for table_name in DATA_TABLES:
        if table_name not in copy_data:
            continue
        
        info = copy_data[table_name]
        cols = info['cols']
        rows = info['rows']
        
        if not rows:
            continue
            
        cols_str = ', '.join([f'"{c}"' for c in cols])
        f.write(f"-- ------------------------------------------------------------------------------\n")
        f.write(f"-- Tabela: {table_name} ({len(rows)} registros)\n")
        f.write(f"-- ------------------------------------------------------------------------------\n")
        
        batch_size = 50
        for b in range(0, len(rows), batch_size):
            chunk = rows[b:b+batch_size]
            values_list = []
            for row in chunk:
                parts = row.split('\t')
                vals = [format_val(parts[idx] if idx < len(parts) else r'\N') for idx in range(len(cols))]
                values_list.append(f"({', '.join(vals)})")
                
            insert_stmt = f"INSERT INTO {table_name} ({cols_str}) VALUES\n" + ",\n".join(values_list) + "\nON CONFLICT DO NOTHING;\n\n"
            f.write(insert_stmt)
            
    f.write("SET session_replication_role = DEFAULT; -- Reativa triggers e chaves estrangeiras\n")

print(f"Arquivo de dados gerado: {data_file}")
