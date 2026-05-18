'use client';

import { useState } from 'react';
import { Save, Eye, EyeOff, CheckCircle, AlertCircle, Wifi, Loader2 } from 'lucide-react';

interface SettingsData {
  // MySQL
  mysqlHost: string;
  mysqlPort: number;
  mysqlUser: string;
  mysqlPassword: string;
  // Cloudflare
  cfApiToken: string;
  cfAccountId: string;
  cfZoneId: string;
  cfTunnelId: string;
  baseDomain: string;
}

interface Props {
  initialSettings: SettingsData;
  dockerHost: string;
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  value: string | number;
  onChange: (name: string, value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isSecret = type === 'password';
  const inputType = isSecret ? (show ? 'text' : 'password') : type;

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="block w-full rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-200"
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

type TestState = 'idle' | 'testing' | 'ok' | 'fail';

function TestConnectionButton({
  service,
  label,
}: {
  service: 'docker' | 'mysql' | 'cloudflare';
  label: string;
}) {
  const [state, setState] = useState<TestState>('idle');
  const [detail, setDetail] = useState('');

  async function run() {
    setState('testing');
    setDetail('');
    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });
      const json = await res.json();
      if (json.data?.ok) {
        const extra =
          json.data.version ?? json.data.tunnelName ?? '';
        setState('ok');
        setDetail(extra ? `Connected${extra ? ` — ${extra}` : ''}` : 'Connected');
      } else {
        setState('fail');
        setDetail(json.data?.error ?? json.error ?? 'Connection failed');
      }
    } catch {
      setState('fail');
      setDetail('Network error');
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={run}
        disabled={state === 'testing'}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {state === 'testing' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wifi className="h-4 w-4" />
        )}
        {state === 'testing' ? 'Testing…' : `Test ${label} Connection`}
      </button>
      {state === 'ok' && (
        <p className="flex items-center gap-1.5 text-xs text-green-400">
          <CheckCircle className="h-3.5 w-3.5" />
          {detail}
        </p>
      )}
      {state === 'fail' && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {detail}
        </p>
      )}
    </div>
  );
}

export function SettingsForm({ initialSettings, dockerHost }: Props) {
  const [form, setForm] = useState<SettingsData>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setStatus('idle');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus('idle');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? 'Failed to save settings.');
        setStatus('error');
      } else {
        setStatus('success');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Docker */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <SectionHeader
          title="Docker Host"
          description="Remote Docker daemon used to launch WordPress containers. Configure DOCKER_HOST in your .env file."
        />
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-gray-400">
            <span className="font-mono text-gray-300">{dockerHost || 'Not configured'}</span>
            <p className="mt-1 text-xs">Edit <span className="font-mono">.env</span> to change the Docker host, network, or image settings.</p>
          </div>
          <TestConnectionButton service="docker" label="Docker" />
        </div>
      </div>

      {/* MySQL Admin */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <SectionHeader
          title="MySQL Admin"
          description="Admin credentials for the shared MySQL server. Used to provision per-instance databases."
        />
        <div className="space-y-4">
          <Row>
            <Field
              label="MySQL Host"
              name="mysqlHost"
              value={form.mysqlHost}
              onChange={handleChange}
              placeholder="127.0.0.1"
            />
            <Field
              label="MySQL Port"
              name="mysqlPort"
              type="number"
              value={form.mysqlPort}
              onChange={handleChange}
              placeholder="3306"
            />
          </Row>
          <Row>
            <Field
              label="Admin User"
              name="mysqlUser"
              value={form.mysqlUser}
              onChange={handleChange}
              placeholder="root"
            />
            <Field
              label="Admin Password"
              name="mysqlPassword"
              type="password"
              value={form.mysqlPassword}
              onChange={handleChange}
              placeholder="••••••••"
            />
          </Row>
          <TestConnectionButton service="mysql" label="MySQL" />
        </div>
      </div>

      {/* Cloudflare */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <SectionHeader
          title="Cloudflare Tunnel"
          description="API credentials and tunnel details for automatically routing each instance to a subdomain."
        />
        <div className="space-y-4">
          <div className="sm:max-w-sm">
            <Field
              label="Base Domain"
              name="baseDomain"
              value={form.baseDomain}
              onChange={handleChange}
              placeholder="sites.yourdomain.com"
              hint="New instances get a subdomain under this domain, e.g. mysite.sites.yourdomain.com"
            />
          </div>
          <div className="sm:max-w-sm">
            <Field
              label="API Token"
              name="cfApiToken"
              type="password"
              value={form.cfApiToken}
              onChange={handleChange}
              placeholder="••••••••"
              hint="Needs Zone:DNS:Edit and Account:Cloudflare Tunnel:Edit permissions."
            />
          </div>
          <Row>
            <Field
              label="Account ID"
              name="cfAccountId"
              value={form.cfAccountId}
              onChange={handleChange}
              placeholder="abc123..."
            />
            <Field
              label="Zone ID"
              name="cfZoneId"
              value={form.cfZoneId}
              onChange={handleChange}
              placeholder="xyz456..."
            />
          </Row>
          <div className="sm:max-w-sm">
            <Field
              label="Tunnel ID"
              name="cfTunnelId"
              value={form.cfTunnelId}
              onChange={handleChange}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
          <TestConnectionButton service="cloudflare" label="Cloudflare" />
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between rounded-xl bg-gray-900 border border-gray-800 px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          {status === 'success' && (
            <>
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-green-400">Settings saved successfully.</span>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-red-400">{errorMsg}</span>
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}
