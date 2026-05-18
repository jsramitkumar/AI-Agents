-- AlterEnum
ALTER TYPE "InstanceStatus" ADD VALUE 'SUSPENDED';

-- AlterTable
ALTER TABLE "WpInstance" ADD COLUMN     "expiresAt" TIMESTAMP(3);
