/**
 * lib/logger.ts
 *
 * Consolidated structured file logger. All services write to a single file:
 *   logs/app.log
 *
 * Each line is a newline-delimited JSON object:
 *   {
 *     logId,        // Global sequential ID:          "LOG-00001"
 *     serviceLogId, // Per-service sequential ID:     "DOCKER-00001"
 *     ts,           // ISO 8601 timestamp
 *     level,        // "info" | "warn" | "error"
 *     channel,      // "docker" | "cloudflare" | "mysql"
 *     message,
 *     ...meta
 *   }
 *
 * Counters are seeded from the existing log file on startup so IDs continue
 * sequentially across server restarts.
 */

import fs from 'fs';
import path from 'path';

export type LogChannel = 'docker' | 'cloudflare' | 'mysql';
export type LogLevel   = 'info' | 'warn' | 'error';

const LOG_DIR  = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure the logs directory exists at module load time.
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch { /* ignore */ }

// ── Sequence counters ────────────────────────────────────────────────────────

let globalSeq = 0;
const channelSeq: Record<LogChannel, number> = { docker: 0, cloudflare: 0, mysql: 0 };

// Seed counters from existing log so IDs resume correctly after a restart.
try {
  const raw = fs.readFileSync(LOG_FILE, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  globalSeq = lines.length;
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as { channel?: string };
      if (entry.channel && entry.channel in channelSeq) {
        channelSeq[entry.channel as LogChannel]++;
      }
    } catch { /* skip malformed lines */ }
  }
} catch { /* file does not exist yet — start from 0 */ }

// ── ID helpers ───────────────────────────────────────────────────────────────

function pad(n: number, width = 5): string {
  return n.toString().padStart(width, '0');
}

const CHANNEL_PREFIX: Record<LogChannel, string> = {
  docker:     'DOCKER',
  cloudflare: 'CF',
  mysql:      'MYSQL',
};

// ── Core write ───────────────────────────────────────────────────────────────

function write(channel: LogChannel, level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const logId       = `LOG-${pad(++globalSeq)}`;
  const serviceLogId = `${CHANNEL_PREFIX[channel]}-${pad(++channelSeq[channel])}`;

  const entry = JSON.stringify({
    logId,
    serviceLogId,
    ts: new Date().toISOString(),
    level,
    channel,
    message,
    ...meta,
  });

  try {
    fs.appendFileSync(LOG_FILE, entry + '\n', 'utf8');
  } catch { /* never crash the application because of a logging failure */ }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  info (channel: LogChannel, message: string, meta?: Record<string, unknown>): void { write(channel, 'info',  message, meta); },
  warn (channel: LogChannel, message: string, meta?: Record<string, unknown>): void { write(channel, 'warn',  message, meta); },
  error(channel: LogChannel, message: string, meta?: Record<string, unknown>): void { write(channel, 'error', message, meta); },
};
