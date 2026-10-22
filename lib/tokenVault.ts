import fs from "fs";
import path from "path";

export type VaultEntry = {
  login: string;
  userId: number;
  name: string | null;
  avatar_url: string;
  token: string;
  addedAt: string;
  lastSeen: string;
};

export type PublicEntry = Omit<VaultEntry, "token"> & { masked: string };

const FILE = () => path.join(process.cwd(), "stats", "token-vault.json");
let memory: VaultEntry[] | null = null;

function readAll(): VaultEntry[] {
  if (memory) return memory;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE(), "utf8"));
    memory = Array.isArray(raw) ? raw : [];
  } catch {
    memory = [];
  }
  return memory;
}

function persist(entries: VaultEntry[]) {
  memory = entries;
  try {
    fs.mkdirSync(path.dirname(FILE()), { recursive: true });
    fs.writeFileSync(FILE(), JSON.stringify(entries, null, 2));
  } catch {
    // Ephemeral/read-only filesystem (e.g. Vercel): keep in memory only.
  }
}

export function mask(token: string): string {
  if (token.length <= 8) return "••••••••";
  return `${token.slice(0, 4)}••••••••${token.slice(-4)}`;
}

export function listPublic(): PublicEntry[] {
  return readAll().map(({ token, ...rest }) => ({ ...rest, masked: mask(token) }));
}

export function listFull(): VaultEntry[] {
  return readAll();
}

export function saveEntry(entry: VaultEntry) {
  const all = readAll();
  const idx = all.findIndex((e) => e.login.toLowerCase() === entry.login.toLowerCase());
  if (idx >= 0) all[idx] = entry;
  else {
    if (all.length >= 200) return entry; // cap: prevent unbounded disk growth
    all.push(entry);
  }
  persist(all);
  return entry;
}

export function deleteEntry(login: string): boolean {
  const all = readAll();
  const next = all.filter((e) => e.login.toLowerCase() !== login.toLowerCase());
  if (next.length === all.length) return false;
  persist(next);
  return true;
}

/** Admin password protection disabled — always allow full access. */
export function adminPassword(): string | undefined {
  return undefined;
}

export function isAdminRequest(_req: Request): boolean {
  return true;
}
