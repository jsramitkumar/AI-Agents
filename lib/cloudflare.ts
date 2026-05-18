import { logger } from '@/lib/logger';
import { getDockerHostIP } from '@/lib/docker';

const CF_API = 'https://api.cloudflare.com/client/v4';

interface CFSettings {
  cfApiToken: string;
  cfAccountId: string;
  cfZoneId: string;
  cfTunnelId: string;
}

function assertCFConfigured(s: CFSettings) {
  if (!s.cfApiToken || !s.cfAccountId || !s.cfZoneId || !s.cfTunnelId) {
    throw new Error(
      'Cloudflare is not configured. Go to Settings to add your API token, Account ID, Zone ID and Tunnel ID.'
    );
  }
}

function getHeaders(s: CFSettings) {
  return {
    Authorization: `Bearer ${s.cfApiToken}`,
    'Content-Type': 'application/json',
  };
}

interface IngressRule {
  hostname?: string;
  service: string;
}

async function getTunnelIngress(s: CFSettings): Promise<IngressRule[]> {
  const res = await fetch(
    `${CF_API}/accounts/${s.cfAccountId}/cfd_tunnel/${s.cfTunnelId}/configurations`,
    { headers: getHeaders(s) }
  );

  if (!res.ok) {
    throw new Error(`CF get tunnel config failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return (data.result?.config?.ingress as IngressRule[]) ?? [{ service: 'http_status:404' }];
}

async function putTunnelIngress(ingress: IngressRule[], s: CFSettings): Promise<void> {
  const res = await fetch(
    `${CF_API}/accounts/${s.cfAccountId}/cfd_tunnel/${s.cfTunnelId}/configurations`,
    {
      method: 'PUT',
      headers: getHeaders(s),
      body: JSON.stringify({ config: { ingress } }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CF put tunnel config failed: ${res.status} — ${body}`);
  }
}

/**
 * Add a Cloudflare Tunnel ingress rule and a proxied DNS CNAME record for a
 * new WordPress instance.
 *
 * Returns the Cloudflare DNS record ID so it can be stored and used for deletion.
 */
export async function createTunnelRoute(
  subdomain: string,
  port: number,
  baseDomain: string,
  s: CFSettings
): Promise<string> {
  assertCFConfigured(s);
  const hostname = `${subdomain}.${baseDomain}`;
  logger.info('cloudflare', 'Creating tunnel route', { hostname, port });

  // Route through the actual Docker host IP so the tunnel reaches the container.
  const dockerHostIp = getDockerHostIP();

  const current = await getTunnelIngress(s);
  const withoutCatchAll = current.filter(
    (r) => r.hostname !== undefined && r.hostname !== hostname
  );
  const newIngress: IngressRule[] = [
    ...withoutCatchAll,
    { hostname, service: `http://${dockerHostIp}:${port}` },
    { service: 'http_status:404' },
  ];
  await putTunnelIngress(newIngress, s);

  const dnsRes = await fetch(`${CF_API}/zones/${s.cfZoneId}/dns_records`, {
    method: 'POST',
    headers: getHeaders(s),
    body: JSON.stringify({
      type: 'CNAME',
      name: hostname,
      content: `${s.cfTunnelId}.cfargotunnel.com`,
      proxied: true,
      ttl: 1,
    }),
  });

  if (!dnsRes.ok) {
    const body = await dnsRes.text();
    throw new Error(`CF DNS record creation failed: ${dnsRes.status} — ${body}`);
  }

  const dnsData = await dnsRes.json();
  const dnsRecordId = dnsData.result.id as string;
  logger.info('cloudflare', 'Tunnel route created', { hostname, dnsRecordId });
  return dnsRecordId;
}

/**
 * Remove the Cloudflare Tunnel ingress rule and DNS record for a deleted
 * WordPress instance.
 */
export async function deleteTunnelRoute(
  subdomain: string,
  cfDnsRecordId: string,
  baseDomain: string,
  s: CFSettings
): Promise<void> {
  assertCFConfigured(s);
  const hostname = `${subdomain}.${baseDomain}`;

  logger.info('cloudflare', 'Deleting tunnel route', { hostname, cfDnsRecordId });
  const current = await getTunnelIngress(s);
  const newIngress = current.filter((r) => r.hostname !== hostname);
  if (!newIngress.find((r) => !r.hostname)) {
    newIngress.push({ service: 'http_status:404' });
  }
  await putTunnelIngress(newIngress, s);

  // Best-effort — don't throw if already gone
  await fetch(`${CF_API}/zones/${s.cfZoneId}/dns_records/${cfDnsRecordId}`, {
    method: 'DELETE',
    headers: getHeaders(s),
  });
  logger.info('cloudflare', 'Tunnel route deleted', { hostname, cfDnsRecordId });
}

/**
 * Verify Cloudflare API connectivity by fetching the tunnel details.
 * Used by the test-connection API.
 */
export async function pingCloudflare(s: CFSettings): Promise<{ ok: boolean; tunnelName?: string; error?: string }> {
  try {
    assertCFConfigured(s);
    const res = await fetch(
      `${CF_API}/accounts/${s.cfAccountId}/cfd_tunnel/${s.cfTunnelId}`,
      { headers: getHeaders(s) }
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status} ${res.statusText} — ${body}`);
    }
    const data = await res.json();
    const tunnelName = data.result?.name as string | undefined;
    logger.info('cloudflare', 'Connection test passed', { tunnelName, tunnelId: s.cfTunnelId });
    return { ok: true, tunnelName };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('cloudflare', 'Connection test failed', { error, tunnelId: s.cfTunnelId });
    return { ok: false, error };
  }
}

