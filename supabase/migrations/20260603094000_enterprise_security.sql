-- Migração: Enterprise Security Setup (RBAC & ABAC) - Versão 1.1
-- Autor: Arquiteto de Banco de Dados Sênior & Especialista em Segurança Supabase
-- Data: 2026-06-03
--
-- Descrição:
-- Esta migração define o esquema de tabelas públicas, triggers de imunidade,
-- funções seguras de consulta e políticas de segurança RLS necessárias para
-- criar um controle de acesso robusto com perfis ("Desenvolvedor", "Administrador", "Usuário").
-- Adiciona suporte total a campos de perfil compatíveis com a interface do Next.js.

-- ============================================================================
-- 1. EXTENSÕES & ENUMS
-- ============================================================================

-- Habilita pgcrypto para geração de UUIDs, hashes criptográficos e senhas (bcrypt)
create extension if not exists pgcrypto;

-- Remove tipos antigos se já existirem para evitar conflitos em recriações
do $$
begin
    if not exists (select 1 from pg_type where typname = 'user_role') then
        create type public.user_role as enum ('Desenvolvedor', 'Administrador', 'Usuário');
    end if;
end
$$;

-- ============================================================================
-- 2. TABELAS PÚBLICAS
-- ============================================================================

-- Tabela: public.usuarios
-- Vincula-se ao schema interno auth.users do Supabase Auth.
create table if not exists public.usuarios (
    id uuid references auth.users on delete cascade primary key,
    user_name text unique not null,
    email text unique not null,
    name text not null, -- Nome de exibição amigável do usuário
    photo_url text, -- Foto de perfil / Avatar
    logo_url text, -- Logotipo da empresa/perfil
    role public.user_role not null default 'Usuário',
    status text not null default 'active', -- active, pending, inactive
    data_expiracao timestamp with time zone default null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Constraint para validar formato mínimo de email e username
    constraint check_email_format check (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
    constraint check_username_length check (char_length(user_name) >= 3)
);

-- Tabela: public.modulos
-- Cadastro de módulos do sistema corporativo (ex: Financeiro, RH, Produção).
create table if not exists public.modulos (
    id uuid default gen_random_uuid() primary key,
    nome text unique not null,
    descricao text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint check_modulo_nome_length check (char_length(nome) >= 2)
);

-- Tabela: public.permissoes_modulos
-- Estrutura relacional ABAC para definir acessos específicos por módulo.
create table if not exists public.permissoes_modulos (
    id uuid default gen_random_uuid() primary key,
    usuario_id uuid references public.usuarios(id) on delete cascade not null,
    modulo_id uuid references public.modulos(id) on delete cascade not null,
    visualizar boolean not null default false,
    interagir boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Garante uma única configuração de permissão por usuário/módulo
    unique(usuario_id, modulo_id)
);

-- ============================================================================
-- 3. FUNÇÕES AUXILIARES DE SEGURANÇA (SECURITY DEFINER)
-- ============================================================================
-- Nota: Declaradas como SECURITY DEFINER para que bypassen o RLS de forma segura,
-- buscando as credenciais necessárias diretamente no banco sem risco de recursão infinita.

-- Retorna a Role do usuário autenticado no momento
create or replace function public.get_my_role()
returns public.user_role
language sql
security definer
set search_path = public, pg_temp
as $$
    select role from public.usuarios where id = auth.uid();
$$;

-- Verifica se o usuário atual tem uma conta com prazo de validade expirado
create or replace function public.is_my_account_expired()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
    select coalesce(data_expiracao < now(), false) from public.usuarios where id = auth.uid();
$$;

-- ============================================================================
-- 4. TIMESTAMPS AUTOMÁTICOS (TRIGGERS)
-- ============================================================================

create or replace function public.handle_update_timestamp()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger para tabela public.usuarios
drop trigger if exists tr_usuarios_timestamp on public.usuarios;
create trigger tr_usuarios_timestamp
    before update on public.usuarios
    for each row execute function public.handle_update_timestamp();

-- Trigger para tabela public.permissoes_modulos
drop trigger if exists tr_permissoes_modulos_timestamp on public.permissoes_modulos;
create trigger tr_permissoes_modulos_timestamp
    before update on public.permissoes_modulos
    for each row execute function public.handle_update_timestamp();

-- ============================================================================
-- 5. TRIGGER DE IMUNIDADE E INTEGRIDADE DO DESENVOLVEDOR
-- ============================================================================
-- Impede fisicamente que qualquer conta de Desenvolvedor seja alterada,
-- deletada ou tenha sua Role alterada por administradores ou outros usuários.

create or replace function public.check_developer_immunity()
returns trigger as $$
declare
    v_executing_user_role public.user_role;
begin
    -- Ignorar trigger se não houver um usuário autenticado executando a query (ex: migrações de backend/super-admin por fora do Supabase API)
    if auth.uid() is null then
        return coalesce(new, old);
    end if;

    -- Descobre a role de quem está executando a operação
    v_executing_user_role := public.get_my_role();

    -- Caso de DELETE: Ninguém (exceto outro Desenvolvedor) pode deletar um Desenvolvedor
    if (tg_op = 'DELETE') then
        if old.role = 'Desenvolvedor'::public.user_role then
            if v_executing_user_role != 'Desenvolvedor'::public.user_role then
                raise exception 'Imunidade de Segurança: Apenas Desenvolvedores podem excluir contas do tipo Desenvolvedor.';
            end if;
        end if;
        return old;
    end if;

    -- Caso de UPDATE: 
    -- 1. Ninguém pode alterar dados de um Desenvolvedor (exceto ele próprio ou outro Desenvolvedor)
    -- 2. Ninguém pode rebaixar a Role de um Desenvolvedor
    -- 3. Ninguém pode elevar um usuário comum para Desenvolvedor sem ser Desenvolvedor
    if (tg_op = 'UPDATE') then
        -- Tentativa de modificar um Desenvolvedor existente
        if old.role = 'Desenvolvedor'::public.user_role then
            if v_executing_user_role != 'Desenvolvedor'::public.user_role then
                raise exception 'Imunidade de Segurança: Modificações em contas de Desenvolvedor são restritas.';
            end if;
            
            -- Bloqueia a tentativa de alterar a role do desenvolvedor para outra role inferior
            if new.role != 'Desenvolvedor'::public.user_role then
                raise exception 'Imunidade de Segurança: Não é permitido rebaixar o perfil de um Desenvolvedor.';
            end if;
        end if;

        -- Tentativa de elevar alguém a Desenvolvedor
        if new.role = 'Desenvolvedor'::public.user_role and old.role != 'Desenvolvedor'::public.user_role then
            if v_executing_user_role != 'Desenvolvedor'::public.user_role then
                raise exception 'Imunidade de Segurança: Apenas Desenvolvedores podem designar novos Desenvolvedores.';
            end if;
        end if;
        
        return new;
    end if;

    return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists tr_usuarios_imunidade on public.usuarios;
create trigger tr_usuarios_imunidade
    before update or delete on public.usuarios
    for each row execute function public.check_developer_immunity();

-- ============================================================================
-- 6. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Ativa RLS em todas as tabelas
alter table public.usuarios enable row level security;
alter table public.modulos enable row level security;
alter table public.permissoes_modulos enable row level security;

-- Limpa políticas legadas para reinstalação limpa
drop policy if exists "Dev_All_Usuarios" on public.usuarios;
drop policy if exists "Admin_Manage_Usuarios" on public.usuarios;
drop policy if exists "User_View_Self" on public.usuarios;

drop policy if exists "Dev_Manage_Modulos" on public.modulos;
drop policy if exists "Users_View_Permitted_Modulos" on public.modulos;

drop policy if exists "Dev_Manage_Permissoes" on public.permissoes_modulos;
drop policy if exists "Users_View_Own_Permissoes" on public.permissoes_modulos;

-------------------------------------------------------------------------------
-- POLÍTICAS: public.usuarios
-------------------------------------------------------------------------------

-- 1. Desenvolvedor tem acesso total a toda a tabela
create policy "Dev_All_Usuarios"
on public.usuarios
for all
to authenticated
using (
    (select public.get_my_role()) = 'Desenvolvedor'::public.user_role
)
with check (
    (select public.get_my_role()) = 'Desenvolvedor'::public.user_role
);

-- 2. Administradores podem ler e atualizar Administradores e Usuários (Desenvolvedor é 100% invisível)
create policy "Admin_Manage_Usuarios"
on public.usuarios
for all
to authenticated
using (
    (select public.get_my_role()) = 'Administrador'::public.user_role
    and role != 'Desenvolvedor'::public.user_role
    and not (select public.is_my_account_expired())
)
with check (
    (select public.get_my_role()) = 'Administrador'::public.user_role
    and role != 'Desenvolvedor'::public.user_role
    and not (select public.is_my_account_expired())
);

-- 3. Usuários comuns só enxergam a si próprios
create policy "User_View_Self"
on public.usuarios
for select
to authenticated
using (
    id = auth.uid()
    and not (select public.is_my_account_expired())
);

-------------------------------------------------------------------------------
-- POLÍTICAS: public.modulos
-------------------------------------------------------------------------------

-- 1. Desenvolvedor cria, edita e deleta módulos livremente
create policy "Dev_Manage_Modulos"
on public.modulos
for all
to authenticated
using (
    (select public.get_my_role()) = 'Desenvolvedor'::public.user_role
)
with check (
    (select public.get_my_role()) = 'Desenvolvedor'::public.user_role
);

-- 2. Outros usuários (Admins/Usuários comuns) visualizam apenas módulos que foram liberados para eles
create policy "Users_View_Permitted_Modulos"
on public.modulos
for select
to authenticated
using (
    (
        (select public.get_my_role()) in ('Administrador'::public.user_role, 'Usuário'::public.user_role)
        and exists (
            select 1 from public.permissoes_modulos pm
            where pm.modulo_id = id
            and pm.usuario_id = auth.uid()
            and pm.visualizar = true
        )
    )
    and not (select public.is_my_account_expired())
);

-------------------------------------------------------------------------------
-- POLÍTICAS: public.permissoes_modulos
-------------------------------------------------------------------------------

-- 1. Desenvolvedor faz a gestão de permissões (ABAC) de todos os módulos
create policy "Dev_Manage_Permissoes"
on public.permissoes_modulos
for all
to authenticated
using (
    (select public.get_my_role()) = 'Desenvolvedor'::public.user_role
)
with check (
    (select public.get_my_role()) = 'Desenvolvedor'::public.user_role
);

-- 2. Qualquer usuário (Admin/Usuário) consegue visualizar suas próprias permissões liberadas
create policy "Users_View_Own_Permissoes"
on public.permissoes_modulos
for select
to authenticated
using (
    usuario_id = auth.uid()
    and not (select public.is_my_account_expired())
);


-- ============================================================================
-- 7. PROCEDIMENTO DE ONBOARDING / CONVITE (RPC FUNCTION)
-- ============================================================================
-- Esta função cria o registro em auth.users e sincroniza com public.usuarios.
-- O e-mail de confirmação é marcado como confirmado imediatamente para evitar travas no login.

-- Drop any existing overloads of the function to prevent parameter mismatch issues in the schema cache
drop function if exists public.create_new_user(text, text, public.user_role, integer);
drop function if exists public.create_new_user(text, text, text, public.user_role, integer);
drop function if exists public.create_new_user(text, text, public.user_role, int4);
drop function if exists public.create_new_user(text, text, text, public.user_role, int4);
drop function if exists public.create_new_user(text, text, text, public.user_role, text, timestamp with time zone);

create or replace function public.create_new_user(
    p_email text,
    p_username text,
    p_name text, -- Nome de exibição do usuário
    p_role public.user_role,
    p_password text,
    p_expires_at timestamp with time zone default null
)
returns jsonb
language plpgsql
security definer -- Executa com privilégios de superusuário para ter escrita no schema auth
set search_path = public, auth, extensions, pg_temp
as $$
declare
    v_creator_role public.user_role;
    v_new_user_id uuid;
    v_response jsonb;
begin
    -- 1. Valida se há um usuário autenticado efetuando a requisição
    if auth.uid() is null then
        raise exception 'Não autorizado. Usuário não autenticado.';
    end if;

    -- 2. Busca e valida permissões da role de quem está executando
    v_creator_role := public.get_my_role();
    
    if v_creator_role is null then
        raise exception 'Não autorizado. Usuário criador sem perfil cadastrado.';
    end if;

    -- 3. Validação de Hierarquia Estrita de Criação
    -- - Desenvolvedor pode criar qualquer um.
    -- - Administrador só cria Administradores e Usuários (NÃO cria Desenvolvedores).
    -- - Usuário comum não cria ninguém.
    if p_role = 'Desenvolvedor'::public.user_role and v_creator_role != 'Desenvolvedor'::public.user_role then
        raise exception 'Hierarquia violada: Apenas Desenvolvedores podem registrar novos Desenvolvedores.';
    end if;

    if v_creator_role = 'Usuário'::public.user_role then
        raise exception 'Acesso negado: Seu nível de acesso não permite a criação de contas.';
    end if;

    -- 4. Validação de formato mínimo de e-mail e username
    if not (p_email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$') then
        raise exception 'Formato de e-mail inválido.';
    end if;

    if char_length(p_username) < 3 then
        raise exception 'Nome de usuário muito curto (mínimo de 3 caracteres).';
    end if;

    -- 5. Inserção no schema auth.users (Supabase Auth)
    begin
        insert into auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_sso_user
        )
        values (
            '00000000-0000-0000-0000-000000000000', -- UUID de instância padrão Supabase
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            p_email,
            crypt(p_password, gen_salt('bf', 10)), -- Criptografia Bcrypt
            now(), -- Confirmação de e-mail desativada (marcada como confirmada)
            now(),
            now(),
            jsonb_build_object('provider', 'email', 'providers', array['email']),
            jsonb_build_object('user_name', p_username, 'full_name', p_name),
            false
        )
        returning id into v_new_user_id;
    exception when unique_violation then
        raise exception 'Este e-mail ou nome de usuário já está cadastrado no sistema.';
    end;

    -- 6. Inserção automática na tabela pública public.usuarios
    insert into public.usuarios (
        id,
        user_name,
        email,
        name,
        role,
        data_expiracao
    )
    values (
        v_new_user_id,
        p_username,
        p_email,
        p_name,
        p_role,
        p_expires_at
    );

    -- 7. Montagem do payload de retorno
    v_response := jsonb_build_object(
        'success', true,
        'user_id', v_new_user_id,
        'username', p_username,
        'name', p_name,
        'email', p_email,
        'role', p_role,
        'password', p_password,
        'expires_at', p_expires_at,
        'onboarding_url', 'https://meusistema.com/onboarding?email=' || url_encode(p_email)
    );

    return v_response;
end;
$$;

-- Função utilitária interna para URL Encode usada na geração do link de onboarding
create or replace function public.url_encode(data text)
returns text
language plpgsql
as $$
declare
    i integer;
    char text;
    result text := '';
begin
    for i in 1..char_length(data) loop
        char := substring(data from i for 1);
        if char ~ '[a-zA-Z0-9_.~-]' then
            result := result || char;
        else
            result := result || '%' || encode(char::bytea, 'hex');
        end if;
    end loop;
    return result;
end;
$$;
