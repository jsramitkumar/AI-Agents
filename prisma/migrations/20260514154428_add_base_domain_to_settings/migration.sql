-- AlterTable
ALTER TABLE "WpInstance" ADD COLUMN     "cfDnsRecordId" TEXT;

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "sshHost" TEXT NOT NULL DEFAULT '',
    "sshPort" INTEGER NOT NULL DEFAULT 22,
    "sshUser" TEXT NOT NULL DEFAULT '',
    "sshKeyPath" TEXT NOT NULL DEFAULT '',
    "sshPassword" TEXT NOT NULL DEFAULT '',
    "wpNetwork" TEXT NOT NULL DEFAULT 'wp-network',
    "mysqlService" TEXT NOT NULL DEFAULT 'mysql',
    "wpImage" TEXT NOT NULL DEFAULT 'wordpress:latest',
    "mysqlHost" TEXT NOT NULL DEFAULT '',
    "mysqlPort" INTEGER NOT NULL DEFAULT 3306,
    "mysqlUser" TEXT NOT NULL DEFAULT 'root',
    "mysqlPassword" TEXT NOT NULL DEFAULT '',
    "cfApiToken" TEXT NOT NULL DEFAULT '',
    "cfAccountId" TEXT NOT NULL DEFAULT '',
    "cfZoneId" TEXT NOT NULL DEFAULT '',
    "cfTunnelId" TEXT NOT NULL DEFAULT '',
    "baseDomain" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
