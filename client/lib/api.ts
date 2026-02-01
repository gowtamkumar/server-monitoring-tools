export const API_BASE_URL = 'http://localhost:4000/api';

export async function fetchMetrics() {
  const res = await fetch(`${API_BASE_URL}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function fetchDockerLogs(containerName: string) {
  const res = await fetch(`${API_BASE_URL}/metrics/docker/${containerName}/logs`);
  if (!res.ok) throw new Error('Failed to fetch docker logs');
  return res.json();
}

export async function fetchDockerProcesses(containerName: string) {
  const res = await fetch(`${API_BASE_URL}/metrics/docker/${containerName}/top`);
  if (!res.ok) throw new Error('Failed to fetch docker processes');
  return res.json();
}

export async function fetchBackups() {
  const res = await fetch(`${API_BASE_URL}/backup/list`);
  if (!res.ok) throw new Error('Failed to fetch backups');
  return res.json();
}

export async function runBackup(type: 'client' | 'db', settings: any) {
  const res = await fetch(`${API_BASE_URL}/backup/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, settings })
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Backup failed');
  }
  return res.json();
}
