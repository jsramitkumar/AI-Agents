import Dockerode from 'dockerode';
import { logger } from '@/lib/logger';

// ── Docker client ─────────────────────────────────────────────────────────────
// Connection is configured entirely through env vars — no UI settings needed.
//
//   DOCKER_HOST      Remote Docker daemon TCP address, e.g. tcp://192.168.1.21:2375
//                    For TLS: tcp://host:2376  (set DOCKER_TLS_VERIFY=1 and DOCKER_CERT_PATH)
//   DOCKER_WP_NETWORK   Docker network shared by WP containers and MySQL (default: wp-network)
//   DOCKER_MYSQL_SERVICE  Hostname of the MySQL container on that network (default: mysql)
//   DOCKER_WP_IMAGE   WordPress Docker image to use (default: wordpress:latest)

function getDockerClient(): Dockerode {
  const host = process.env.DOCKER_HOST;
  if (!host) {
    throw new Error('DOCKER_HOST is not set. Add it to .env, e.g. tcp://192.168.1.21:2375');
  }

  // Parse tcp://host:port
  const match = host.match(/^tcp:\/\/([^:]+):(\d+)$/);
  if (!match) {
    throw new Error(`DOCKER_HOST must be in the form tcp://host:port, got: ${host}`);
  }

  return new Dockerode({ host: match[1], port: parseInt(match[2], 10) });
}

function getDockerDefaults() {
  return {
    wpNetwork: process.env.DOCKER_WP_NETWORK ?? 'wp-network',
    mysqlService: process.env.DOCKER_MYSQL_SERVICE ?? 'mysql',
    wpImage: process.env.DOCKER_WP_IMAGE ?? 'wordpress:latest',
  };
}

export interface CreateContainerParams {
  instanceId: string;
  subdomain: string;
  port: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
}

/**
 * Returns the Docker host IP parsed from DOCKER_HOST (tcp://host:port).
 * Falls back to '127.0.0.1' if not set or unparseable.
 */
export function getDockerHostIP(): string {
  const match = (process.env.DOCKER_HOST ?? '').match(/^tcp:\/\/([^:]+):\d+$/);
  return match ? match[1] : '127.0.0.1';
}

/**
 * Spin up a new WordPress container on the remote Docker host.
 * Returns the full container ID.
 */
export async function createWordPressContainer(params: CreateContainerParams): Promise<string> {
  const docker = getDockerClient();
  const { wpNetwork, mysqlService, wpImage } = getDockerDefaults();

  logger.info('docker', 'Creating WordPress container', { instanceId: params.instanceId, subdomain: params.subdomain, port: params.port, wpImage, wpNetwork });
  const container = await docker.createContainer({
    name: params.subdomain,
    Image: wpImage,
    Env: [
      `WORDPRESS_DB_HOST=${mysqlService}`,
      `WORDPRESS_DB_NAME=${params.dbName}`,
      `WORDPRESS_DB_USER=${params.dbUser}`,
      `WORDPRESS_DB_PASSWORD=${params.dbPassword}`,
    ],
    HostConfig: {
      PortBindings: {
        '80/tcp': [{ HostPort: String(params.port) }],
      },
      RestartPolicy: { Name: 'unless-stopped' },
      NetworkMode: wpNetwork,
    },
    ExposedPorts: { '80/tcp': {} },
  });

  await container.start();
  logger.info('docker', 'Container started', { instanceId: params.instanceId, containerId: container.id });
  return container.id;
}

/**
 * Stop and remove a WordPress container on the remote Docker host.
 */
export async function deleteWordPressContainer(containerId: string): Promise<void> {
  const docker = getDockerClient();
  const container = docker.getContainer(containerId);
  logger.info('docker', 'Stopping container', { containerId });

  try {
    await container.stop({ t: 10 });
  } catch {
    // Already stopped — continue to removal
    logger.warn('docker', 'Container already stopped', { containerId });
  }

  await container.remove({ force: true });
  logger.info('docker', 'Container removed', { containerId });
}

/**
 * Get the runtime status of a container (running, exited, etc.).
 * Returns 'missing' if the container no longer exists.
 */
export async function getContainerStatus(containerId: string): Promise<string> {
  const docker = getDockerClient();
  try {
    const info = await docker.getContainer(containerId).inspect();
    logger.info('docker', 'Container status', { containerId, status: info.State.Status });
    return info.State.Status;
  } catch {
    logger.warn('docker', 'Container not found', { containerId });
    return 'missing';
  }
}

/**
 * Ping the Docker daemon to verify connectivity. Used by the test-connection API.
 */
export async function pingDocker(): Promise<{ ok: boolean; version?: string; error?: string }> {
  try {
    const docker = getDockerClient();
    const info = await docker.info();
    const version = info.ServerVersion as string | undefined;
    logger.info('docker', 'Connection test passed', { version, host: process.env.DOCKER_HOST });
    return { ok: true, version };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('docker', 'Connection test failed', { error, host: process.env.DOCKER_HOST });
    return { ok: false, error };
  }
}
