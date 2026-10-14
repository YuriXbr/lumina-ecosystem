-- Lumina: modelo relacional PROPOSTO, PostgreSQL. Não executado no banco do usuário.
-- Decomposição dos principais domínios observados; não é migração/ETL dos 302 campos.
-- Tabelas adicionais de sessões/ledger/jobs são propostas para resolver achados.
-- Executar somente em banco vazio de staging após revisar MODELOS.md.
BEGIN;
CREATE SCHEMA lumina_model;
SET LOCAL search_path = lumina_model, public;

CREATE TABLE discord_user (
  discord_id text PRIMARY KEY CHECK (discord_id ~ '^[0-9]{16,20}$')
);

CREATE TABLE account (
  account_id text PRIMARY KEY, -- preservar IDs existentes; não assumir UUID sem auditoria
  legacy_mongo_id char(24) UNIQUE,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  username text CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{4,16}$'),
  display_name text CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 32),
  username_changed_at timestamptz,
  display_name_changed_at timestamptz,
  access_type text NOT NULL DEFAULT 'user' CHECK (access_type IN ('user','vipUser','enterpriseUser','contentCreator','tester','support','moderator','admin','headadmin','developer','coowner','owner')),
  registered_at timestamptz NOT NULL,
  blocked boolean NOT NULL DEFAULT false,
  banned boolean NOT NULL DEFAULT false,
  deletion_requested_at timestamptz,
  deletion_scheduled_for timestamptz,
  CHECK ((deletion_requested_at IS NULL) = (deletion_scheduled_for IS NULL)),
  CHECK (deletion_scheduled_for IS NULL OR deletion_scheduled_for >= deletion_requested_at)
);
CREATE UNIQUE INDEX account_email_normalized_uq ON account (lower(email));
CREATE UNIQUE INDEX account_username_normalized_uq ON account (lower(username)) WHERE username IS NOT NULL;
CREATE INDEX account_deletion_due_idx ON account (deletion_scheduled_for) WHERE deletion_scheduled_for IS NOT NULL;

CREATE TABLE account_preferences (
  account_id text PRIMARY KEY REFERENCES account ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  discord_notifications boolean NOT NULL DEFAULT true,
  bot_activity_alerts boolean NOT NULL DEFAULT false,
  public_profile boolean NOT NULL DEFAULT false,
  show_online_status boolean NOT NULL DEFAULT true,
  language text NOT NULL DEFAULT 'pt-BR',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo'
);
CREATE TABLE account_contact (
  account_id text PRIMARY KEY REFERENCES account ON DELETE CASCADE,
  government_id_ciphertext bytea, phone_ciphertext bytea, birth_date date,
  country text, state text, city text, street text, number text, complement text, zip_code text
); -- campos opcionais: avaliar necessidade de coleta antes de importação
CREATE TABLE account_security (
  account_id text PRIMARY KEY REFERENCES account ON DELETE CASCADE,
  password_hash text, email_verified boolean NOT NULL DEFAULT false,
  mfa_enabled boolean NOT NULL DEFAULT false,
  mfa_secret_ciphertext bytea, credential_version bigint NOT NULL DEFAULT 0 CHECK (credential_version >= 0),
  last_password_change timestamptz, password_attempts integer NOT NULL DEFAULT 0 CHECK (password_attempts >= 0),
  password_locked_until timestamptz,
  CHECK (NOT mfa_enabled OR mfa_secret_ciphertext IS NOT NULL)
);
CREATE TABLE mfa_backup_code (
  account_id text NOT NULL REFERENCES account ON DELETE CASCADE,
  code_hash text NOT NULL, generated_at timestamptz NOT NULL, expires_at timestamptz, used_at timestamptz,
  PRIMARY KEY (account_id, code_hash)
);
CREATE TABLE credential_action (
  action_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id text NOT NULL REFERENCES account ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('verify_email','reset_password','oauth_exchange')),
  token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), CHECK (expires_at > created_at)
);
CREATE TABLE oauth_identity (
  identity_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id text NOT NULL REFERENCES account ON DELETE CASCADE,
  provider text NOT NULL, provider_user_id text NOT NULL,
  discord_id text UNIQUE REFERENCES discord_user,
  linked_at timestamptz NOT NULL,
  access_token_ciphertext bytea, refresh_token_ciphertext bytea, key_version text,
  expires_at timestamptz, scope text, token_type text, requested_at timestamptz,
  UNIQUE (provider, provider_user_id), UNIQUE (account_id, provider),
  CHECK ((provider = 'discord' AND discord_id IS NOT NULL AND discord_id = provider_user_id) OR (provider <> 'discord' AND discord_id IS NULL))
);
CREATE TABLE auth_session (
  session_id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES account ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE, credential_version bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz,
  CHECK (expires_at > created_at)
);
CREATE INDEX auth_session_account_idx ON auth_session (account_id, expires_at);
CREATE TABLE account_security_event (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id text REFERENCES account ON DELETE SET NULL,
  kind text NOT NULL, occurred_at timestamptz NOT NULL, expires_at timestamptz,
  actor_account_id text REFERENCES account ON DELETE SET NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb -- telemetria/minimização e retenção explícitas
);

CREATE TABLE guild (
  guild_id text PRIMARY KEY CHECK (guild_id ~ '^[0-9]{16,20}$'),
  reference_name text NOT NULL,
  owner_discord_id text NOT NULL REFERENCES discord_user
);
-- Recursos externos: sem assumir que o MongoDB já persiste este catálogo.
CREATE TABLE discord_channel (
  guild_id text NOT NULL REFERENCES guild ON DELETE CASCADE,
  channel_id text NOT NULL, name text, type integer,
  PRIMARY KEY (guild_id, channel_id)
);
CREATE TABLE discord_role (
  guild_id text NOT NULL REFERENCES guild ON DELETE CASCADE,
  role_id text NOT NULL, name text, position integer,
  PRIMARY KEY (guild_id, role_id)
);
CREATE TABLE guild_settings (
  guild_id text PRIMARY KEY REFERENCES guild ON DELETE CASCADE,
  prefix text NOT NULL DEFAULT 'l!', locale text NOT NULL DEFAULT 'en-US',
  mute_role_id text, ban_role_id text, dj_role_id text,
  moderation_channel_id text, bot_info_channel_id text, event_log_channel_id text,
  member_join_channel_id text, member_leave_channel_id text,
  dj_enabled boolean NOT NULL DEFAULT false,
  persistent_mute boolean NOT NULL DEFAULT true, persistent_warns boolean NOT NULL DEFAULT true,
  warns_to_mute integer NOT NULL DEFAULT 3 CHECK (warns_to_mute >= 0),
  warns_to_timeout integer NOT NULL DEFAULT 5 CHECK (warns_to_timeout >= 0),
  warns_to_kick integer NOT NULL DEFAULT 6 CHECK (warns_to_kick >= 0),
  warns_to_ban integer NOT NULL DEFAULT 7 CHECK (warns_to_ban >= 0),
  auto_warn_punishment boolean NOT NULL DEFAULT false, can_punish_staff boolean NOT NULL DEFAULT true,
  member_dm_toggle boolean NOT NULL DEFAULT false, member_welcome_toggle boolean NOT NULL DEFAULT false,
  member_join_message text NOT NULL DEFAULT '', member_leave_message text NOT NULL DEFAULT '', member_join_dm_message text NOT NULL DEFAULT '',
  warn_duration_ms bigint NOT NULL DEFAULT 7776000000 CHECK (warn_duration_ms >= 0),
  gacha_enabled boolean NOT NULL DEFAULT true, gacha_chests_enabled boolean NOT NULL DEFAULT true,
  gacha_max_rolls integer NOT NULL DEFAULT 8 CHECK (gacha_max_rolls >= 0),
  gacha_game_mode text NOT NULL DEFAULT 'personal',
  gacha_refresh_interval_ms bigint NOT NULL DEFAULT 10800000 CHECK (gacha_refresh_interval_ms > 0),
  gacha_last_refresh timestamptz, version bigint NOT NULL DEFAULT 0,
  FOREIGN KEY (guild_id,mute_role_id) REFERENCES discord_role,
  FOREIGN KEY (guild_id,ban_role_id) REFERENCES discord_role,
  FOREIGN KEY (guild_id,dj_role_id) REFERENCES discord_role,
  FOREIGN KEY (guild_id,moderation_channel_id) REFERENCES discord_channel,
  FOREIGN KEY (guild_id,bot_info_channel_id) REFERENCES discord_channel,
  FOREIGN KEY (guild_id,event_log_channel_id) REFERENCES discord_channel,
  FOREIGN KEY (guild_id,member_join_channel_id) REFERENCES discord_channel,
  FOREIGN KEY (guild_id,member_leave_channel_id) REFERENCES discord_channel
);
CREATE TABLE command_definition (
  command_id text PRIMARY KEY, category text NOT NULL, discord_name text NOT NULL UNIQUE
);
CREATE TABLE guild_command_policy (
  guild_id text NOT NULL REFERENCES guild ON DELETE CASCADE,
  command_id text NOT NULL REFERENCES command_definition,
  enabled boolean NOT NULL, PRIMARY KEY (guild_id,command_id)
);
CREATE TABLE auto_message (
  message_id text PRIMARY KEY, guild_id text NOT NULL REFERENCES guild ON DELETE CASCADE,
  channel_id text NOT NULL, message text NOT NULL,
  interval_minutes integer NOT NULL CHECK (interval_minutes > 0), enabled boolean NOT NULL DEFAULT true,
  next_run_at timestamptz, lease_until timestamptz,
  FOREIGN KEY (guild_id,channel_id) REFERENCES discord_channel
);
CREATE TABLE guild_user_block (
  guild_id text NOT NULL REFERENCES guild ON DELETE CASCADE,
  discord_id text NOT NULL REFERENCES discord_user, PRIMARY KEY (guild_id,discord_id)
);
CREATE TABLE guild_role_block (
  guild_id text NOT NULL, role_id text NOT NULL,
  PRIMARY KEY (guild_id,role_id), FOREIGN KEY (guild_id,role_id) REFERENCES discord_role ON DELETE CASCADE
);
CREATE TABLE guild_channel_block (
  guild_id text NOT NULL, channel_id text NOT NULL,
  PRIMARY KEY (guild_id,channel_id), FOREIGN KEY (guild_id,channel_id) REFERENCES discord_channel ON DELETE CASCADE
);
CREATE TABLE guild_roll_state (
  guild_id text NOT NULL REFERENCES guild ON DELETE CASCADE,
  discord_id text NOT NULL REFERENCES discord_user,
  rolls_used integer NOT NULL CHECK (rolls_used >= 0), window_started_at timestamptz NOT NULL,
  PRIMARY KEY (guild_id,discord_id)
); -- interpretação futura de gachaRolls deve ser validada antes do ETL
CREATE TABLE guild_inventory_legacy (
  guild_id text PRIMARY KEY REFERENCES guild ON DELETE CASCADE,
  payload jsonb NOT NULL -- usersInventory/gachaRolls não observado: preservar sem inventar formato
);

CREATE TABLE champion (
  champion_alias text PRIMARY KEY, name text NOT NULL, update_patch text NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE skin (
  skin_id bigint PRIMARY KEY, champion_alias text NOT NULL REFERENCES champion,
  name text NOT NULL, description text, is_base boolean, rarity text, is_legacy boolean,
  splash_path text, load_screen_path text, tile_path text, uncentered_splash_path text,
  update_patch text NOT NULL, updated_at timestamptz NOT NULL,
  source_metadata jsonb -- championdata: metadata de origem; alias/nome canônicos vêm de champion
);
CREATE INDEX skin_champion_idx ON skin (champion_alias);
CREATE TABLE skin_line (
  line_id text PRIMARY KEY, name text NOT NULL, description text NOT NULL,
  update_patch text NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE universe (
  universe_id text PRIMARY KEY, name text NOT NULL, description text NOT NULL,
  update_patch text NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE skin_line_member (
  skin_id bigint NOT NULL REFERENCES skin ON DELETE CASCADE,
  line_id text NOT NULL REFERENCES skin_line, PRIMARY KEY (skin_id,line_id)
);
CREATE TABLE universe_line (
  universe_id text NOT NULL REFERENCES universe ON DELETE CASCADE,
  line_id text NOT NULL REFERENCES skin_line, PRIMARY KEY (universe_id,line_id)
); -- FK proposta: confirmar correspondência de universes.skinsSets com skin line IDs
CREATE VIEW skin_aggregate AS
  SELECT champion_alias, rarity, is_legacy, count(*) AS quantity
  FROM skin GROUP BY champion_alias, rarity, is_legacy;
-- Não equivaler automaticamente rarity='legacy' a is_legacy: reconciliar regra de sorteio.

CREATE TABLE inventory (
  discord_id text PRIMARY KEY REFERENCES discord_user,
  daily_claimed_at timestamptz, next_daily_at timestamptz,
  daily_streak integer NOT NULL DEFAULT 0 CHECK (daily_streak >= 0)
);
CREATE TABLE resource_definition (
  resource_code text PRIMARY KEY,
  initial_quantity bigint NOT NULL DEFAULT 0 CHECK (initial_quantity >= 0)
);
INSERT INTO resource_definition VALUES ('hextechChests',10),('masterWorkChests',1),('keys',11),('mythicEssence',0),('blueEssence',0),('orangeEssence',0);
CREATE TABLE inventory_resource (
  discord_id text NOT NULL REFERENCES inventory ON DELETE CASCADE,
  resource_code text NOT NULL REFERENCES resource_definition,
  quantity bigint NOT NULL CHECK (quantity >= 0), PRIMARY KEY (discord_id,resource_code)
); -- inicializar linhas/defaults via serviço; FK/CHECK não implementam crédito diário
CREATE TABLE inventory_skin (
  discord_id text NOT NULL REFERENCES inventory ON DELETE CASCADE,
  skin_id bigint NOT NULL REFERENCES skin,
  quantity bigint NOT NULL CHECK (quantity > 0), PRIMARY KEY (discord_id,skin_id)
);
CREATE TABLE inventory_skin_shard (
  discord_id text NOT NULL REFERENCES inventory ON DELETE CASCADE,
  skin_id bigint NOT NULL REFERENCES skin,
  quantity bigint NOT NULL CHECK (quantity > 0), PRIMARY KEY (discord_id,skin_id)
);
CREATE TABLE inventory_champion (
  discord_id text NOT NULL REFERENCES inventory ON DELETE CASCADE,
  champion_alias text NOT NULL REFERENCES champion,
  kind text NOT NULL CHECK (kind IN ('owned','shard')),
  quantity bigint NOT NULL CHECK (quantity > 0), PRIMARY KEY (discord_id,champion_alias,kind)
);
CREATE TABLE economy_operation (
  operation_id text PRIMARY KEY,
  discord_id text NOT NULL REFERENCES inventory,
  idempotency_key text NOT NULL,
  kind text NOT NULL, status text NOT NULL CHECK (status IN ('pending','committed','compensating','compensated','failed')),
  created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  result_skin_id bigint REFERENCES skin, context jsonb,
  UNIQUE (discord_id,idempotency_key)
);
CREATE TABLE resource_movement (
  movement_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operation_id text NOT NULL REFERENCES economy_operation,
  resource_code text NOT NULL REFERENCES resource_definition,
  delta bigint NOT NULL CHECK (delta <> 0), created_at timestamptz NOT NULL DEFAULT now()
); -- transação deve atualizar saldo e ledger juntos

CREATE TABLE punishment (
  punishment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  legacy_collection text, legacy_mongo_id char(24),
  guild_id text NOT NULL REFERENCES guild,
  target_discord_id text NOT NULL REFERENCES discord_user,
  staff_discord_id text NOT NULL REFERENCES discord_user,
  kind text NOT NULL CHECK (kind IN ('ban','mute','warn','kick','timeout')),
  reason text NOT NULL DEFAULT '', started_at timestamptz NOT NULL, expires_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','processing','expired','revoked','failed')),
  lease_until timestamptz, next_attempt_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0), last_error_code text,
  UNIQUE (legacy_collection,legacy_mongo_id), CHECK (expires_at IS NULL OR expires_at >= started_at)
);
CREATE INDEX punishment_due_idx ON punishment (status,expires_at,next_attempt_at);
CREATE INDEX punishment_target_idx ON punishment (guild_id,target_discord_id,kind,started_at DESC);
CREATE TABLE user_history (
  history_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discord_id text NOT NULL REFERENCES discord_user,
  legacy_mongo_id char(24) UNIQUE, payload jsonb NOT NULL
); -- campos lastPunishment/warns etc. Mixed; formato não observado (coleção vazia)

CREATE TABLE badge (
  badge_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE CHECK (code = upper(code)), name text NOT NULL, description text NOT NULL DEFAULT '',
  image_url text, rarity text NOT NULL DEFAULT 'common', highlight_color text NOT NULL DEFAULT '#8B5CF6',
  available_from timestamptz NOT NULL, expires_at timestamptz,
  max_redemptions bigint NOT NULL DEFAULT 0 CHECK (max_redemptions >= 0),
  redemption_count bigint NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  min_access_level text NOT NULL DEFAULT 'user', created_by_account_id text REFERENCES account ON DELETE SET NULL,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, active boolean NOT NULL DEFAULT true,
  CHECK (expires_at IS NULL OR expires_at >= available_from),
  CHECK (max_redemptions = 0 OR redemption_count <= max_redemptions)
);
CREATE TABLE badge_redemption (
  account_id text NOT NULL REFERENCES account ON DELETE CASCADE,
  badge_id bigint NOT NULL REFERENCES badge,
  redeemed_at timestamptz NOT NULL, redeemed_via text NOT NULL CHECK (redeemed_via IN ('dashboard','bot')),
  PRIMARY KEY (account_id,badge_id)
); -- manter contador de quota e insert na mesma transação; CHECK sozinho não o sincroniza
CREATE TABLE news_post (
  post_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, legacy_mongo_id char(24) UNIQUE,
  title text NOT NULL, body text NOT NULL, excerpt text, image_url text, tag text NOT NULL DEFAULT 'novidade',
  pinned boolean NOT NULL DEFAULT false, published_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  author_account_id text REFERENCES account ON DELETE SET NULL, author_display_snapshot text
);
CREATE INDEX news_feed_idx ON news_post (pinned DESC,published_at DESC);

CREATE TABLE bot (
  client_id text PRIMARY KEY, prefix text NOT NULL DEFAULT 'l!',
  activity_status text, activity_type text, activity_name text, activity_url text,
  secret_reference text, redirect_uri text, main_guild_id text REFERENCES guild, log_guild_id text REFERENCES guild,
  dev_mode boolean NOT NULL DEFAULT false, maintenance_mode boolean NOT NULL DEFAULT false,
  webhook_secret_reference text, github_webhook_secret_reference text
); -- credenciais/webhooks em vault, não em configuração pública
CREATE TABLE bot_staff (
  client_id text NOT NULL REFERENCES bot ON DELETE CASCADE,
  discord_id text NOT NULL REFERENCES discord_user,
  role text NOT NULL CHECK (role IN ('owner','admin','moderator')),
  PRIMARY KEY (client_id,discord_id,role)
);
CREATE TABLE bot_staff_permission (
  client_id text NOT NULL REFERENCES bot ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','moderator')),
  permission text NOT NULL, PRIMARY KEY (client_id,role,permission)
);
CREATE TABLE bot_deploy_guild (
  client_id text NOT NULL REFERENCES bot ON DELETE CASCADE,
  guild_id text NOT NULL REFERENCES guild, PRIMARY KEY (client_id,guild_id)
);
CREATE TABLE bot_log_channel (
  client_id text NOT NULL REFERENCES bot ON DELETE CASCADE,
  purpose text NOT NULL, guild_id text NOT NULL, channel_id text NOT NULL,
  PRIMARY KEY (client_id,purpose), FOREIGN KEY (guild_id,channel_id) REFERENCES discord_channel
);

CREATE TABLE api_log (
  log_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id text, level text NOT NULL, type text, action text, message text, route text, method text,
  status_code integer, duration_ms double precision CHECK (duration_ms IS NULL OR duration_ms >= 0),
  account_id text REFERENCES account ON DELETE SET NULL, discord_id text REFERENCES discord_user ON DELETE SET NULL,
  ip text, user_agent text, context jsonb, environment text, created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX api_log_expiry_idx ON api_log (expires_at);
CREATE INDEX api_log_request_idx ON api_log (request_id);
CREATE INDEX api_log_level_date_idx ON api_log (level,created_at DESC);
CREATE INDEX api_log_route_date_idx ON api_log (route,created_at DESC);
CREATE TABLE api_cache (
  cache_key text PRIMARY KEY, value jsonb NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL
);
CREATE INDEX api_cache_expiry_idx ON api_cache (expires_at);
CREATE TABLE ip_rate_limit (
  ip text NOT NULL, route text NOT NULL, window_start timestamptz NOT NULL,
  request_count bigint NOT NULL CHECK (request_count >= 0), block_count bigint NOT NULL CHECK (block_count >= 0),
  blocked_until timestamptz, updated_at timestamptz NOT NULL, PRIMARY KEY (ip,route)
);
CREATE INDEX ip_rate_limit_update_idx ON ip_rate_limit (updated_at);
-- TTL MongoDB exige jobs DELETE no PostgreSQL; não aplicado automaticamente por estes índices.
-- Cascades acima são propostas para staging. Reavaliar política de retenção/erasure antes de produção.
-- Dados do Discord não são apagados junto à conta do dashboard: domínio do bot precisa de regra explícita.
COMMIT;
