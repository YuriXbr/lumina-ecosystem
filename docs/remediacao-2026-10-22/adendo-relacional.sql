-- PROPOSTA DOCUMENTAL. Aplicar somente após o modelo-relacional.sql histórico.
-- Não executado em PostgreSQL ou MongoDB. Expiração exige job próprio no SQL.
BEGIN;
SET LOCAL search_path = lumina_model, public;
ALTER TABLE account_security ADD COLUMN session_version bigint NOT NULL DEFAULT 0 CHECK (session_version >= 0);
ALTER TABLE guild ADD COLUMN bot_present boolean NOT NULL DEFAULT true;
ALTER TABLE guild ADD COLUMN last_synced_at timestamptz;

CREATE TABLE email_code_state (
 account_id text PRIMARY KEY REFERENCES account ON DELETE CASCADE,
 purpose text CHECK (purpose IN ('verify','reset')),
 credential_version bigint CHECK (credential_version >= 0),
 code_hmac text,
 request_id uuid,
 requested_at timestamptz,
 expires_at timestamptz,
 attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
 consumed_at timestamptz,
 blocked_until timestamptz,
 purge_at timestamptz,
 delivery_state text CHECK (delivery_state IN ('pending','sent','failed'))
);
CREATE INDEX email_code_purge_idx ON email_code_state(purge_at);
CREATE TABLE email_code_rejection (
 token_hash text PRIMARY KEY,
 account_id text NOT NULL REFERENCES account ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 used_at timestamptz
);
CREATE INDEX email_rejection_expiry_idx ON email_code_rejection(expires_at);
CREATE TABLE jwt_revocation (
 token_hash text PRIMARY KEY,
 expires_at timestamptz NOT NULL
);
CREATE TABLE oauth_transaction_nonce (
 nonce_hash text PRIMARY KEY,
 expires_at timestamptz NOT NULL
);
CREATE TABLE oauth_session_exchange (
 code_hash text PRIMARY KEY,
 encrypted_session text NOT NULL,
 origin text NOT NULL,
 browser_hash text NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE TABLE bot_worker (
 worker_id uuid PRIMARY KEY,
 bot_id text NOT NULL CHECK (bot_id ~ '^[0-9]{16,20}$'),
 ready boolean NOT NULL,
 guild_count integer NOT NULL CHECK (guild_count >= 0),
 ping_ms double precision NOT NULL CHECK (ping_ms >= 0),
 uptime_seconds double precision NOT NULL CHECK (uptime_seconds >= 0),
 memory_mb double precision NOT NULL CHECK (memory_mb >= 0),
 version text,
 last_seen_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE TABLE bot_console_event (
 ingest_cursor bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_id uuid NOT NULL UNIQUE,
 worker_id uuid REFERENCES bot_worker ON DELETE SET NULL,
 level text NOT NULL CHECK (level IN ('info','warning','error','debug','success','system')),
 message varchar(2000) NOT NULL,
 occurred_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE INDEX bot_console_expiry_idx ON bot_console_event(expires_at);
CREATE TABLE bot_diagnostic (
 request_id uuid PRIMARY KEY,
 requested_by text REFERENCES account ON DELETE SET NULL,
 command text NOT NULL CHECK (command IN ('status','ping','guilds','help')),
 state text NOT NULL CHECK (state IN ('pending','running','completed','failed','expired')),
 output varchar(2000),
 created_at timestamptz NOT NULL,
 deadline timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 leased_by uuid REFERENCES bot_worker(worker_id) ON DELETE SET NULL,
 lease_token uuid,
 lease_until timestamptz,
 finished_at timestamptz
);
CREATE INDEX bot_diagnostic_claim_idx ON bot_diagnostic(state,deadline,lease_until,created_at);
CREATE INDEX bot_diagnostic_actor_idx ON bot_diagnostic(requested_by,created_at DESC);

COMMIT;
