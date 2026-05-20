-- ─────────────────────────────────────────────────────────────────────────────
-- Consolidated initial migration — squashed from 5 incremental migrations:
--   20260514151853_1
--   20260514154428_add_base_domain_to_settings
--   20260514160328_add_user_roles
--   20260514162557_remove_ssh_docker_settings
--   20260517173955_add_expiry_and_suspended
-- ─────────────────────────────────────────────────────────────────────────────

-- Enums
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CUSTOMER');
CREATE TYPE "InstanceStatus" AS ENUM ('PENDING', 'RUNNING', 'STOPPED', 'SUSPENDED', 'DELETING', 'ERROR');

-- User
CREATE TABLE "User" (
    "id"            TEXT         NOT NULL,
    "name"          TEXT,
    "email"         TEXT         NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image"         TEXT,
    "password"      TEXT,
    "role"          "Role"       NOT NULL DEFAULT 'CUSTOMER',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Account (NextAuth OAuth accounts)
CREATE TABLE "Account" (
    "id"                TEXT    NOT NULL,
    "userId"            TEXT    NOT NULL,
    "type"              TEXT    NOT NULL,
    "provider"          TEXT    NOT NULL,
    "providerAccountId" TEXT    NOT NULL,
    "refresh_token"     TEXT,
    "access_token"      TEXT,
    "expires_at"        INTEGER,
    "token_type"        TEXT,
    "scope"             TEXT,
    "id_token"          TEXT,
    "session_state"     TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Session (NextAuth sessions)
CREATE TABLE "Session" (
    "id"           TEXT         NOT NULL,
    "sessionToken" TEXT         NOT NULL,
    "userId"       TEXT         NOT NULL,
    "expires"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VerificationToken (NextAuth email verification)
CREATE TABLE "VerificationToken" (
    "identifier" TEXT         NOT NULL,
    "token"      TEXT         NOT NULL,
    "expires"    TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "VerificationToken_token_key"            ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- WpInstance
CREATE TABLE "WpInstance" (
    "id"            TEXT             NOT NULL,
    "name"          TEXT             NOT NULL,
    "subdomain"     TEXT             NOT NULL,
    "containerId"   TEXT,
    "port"          INTEGER          NOT NULL,
    "dbName"        TEXT             NOT NULL,
    "dbUser"        TEXT             NOT NULL,
    "dbPassword"    TEXT             NOT NULL,
    "status"        "InstanceStatus" NOT NULL DEFAULT 'PENDING',
    "cfDnsRecordId" TEXT,
    "expiresAt"     TIMESTAMP(3),
    "userId"        TEXT             NOT NULL,
    "createdAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "WpInstance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WpInstance_subdomain_key" ON "WpInstance"("subdomain");
CREATE UNIQUE INDEX "WpInstance_port_key"      ON "WpInstance"("port");
CREATE UNIQUE INDEX "WpInstance_dbName_key"    ON "WpInstance"("dbName");
CREATE UNIQUE INDEX "WpInstance_dbUser_key"    ON "WpInstance"("dbUser");
ALTER TABLE "WpInstance" ADD CONSTRAINT "WpInstance_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SystemSettings (singleton — only MySQL + Cloudflare config; SSH/Docker fields removed)
CREATE TABLE "SystemSettings" (
    "id"           TEXT         NOT NULL DEFAULT 'singleton',
    "mysqlHost"    TEXT         NOT NULL DEFAULT '',
    "mysqlPort"    INTEGER      NOT NULL DEFAULT 3306,
    "mysqlUser"    TEXT         NOT NULL DEFAULT 'root',
    "mysqlPassword" TEXT        NOT NULL DEFAULT '',
    "cfApiToken"   TEXT         NOT NULL DEFAULT '',
    "cfAccountId"  TEXT         NOT NULL DEFAULT '',
    "cfZoneId"     TEXT         NOT NULL DEFAULT '',
    "cfTunnelId"   TEXT         NOT NULL DEFAULT '',
    "baseDomain"   TEXT         NOT NULL DEFAULT '',
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
