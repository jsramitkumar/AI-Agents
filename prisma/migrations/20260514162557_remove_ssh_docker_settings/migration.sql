/*
  Warnings:

  - You are about to drop the column `mysqlService` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `sshHost` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `sshKeyPath` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `sshPassword` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `sshPort` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `sshUser` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `wpImage` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `wpNetwork` on the `SystemSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SystemSettings" DROP COLUMN "mysqlService",
DROP COLUMN "sshHost",
DROP COLUMN "sshKeyPath",
DROP COLUMN "sshPassword",
DROP COLUMN "sshPort",
DROP COLUMN "sshUser",
DROP COLUMN "wpImage",
DROP COLUMN "wpNetwork";
