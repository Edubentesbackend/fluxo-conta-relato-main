import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to export data.");
}

async function fetchTable<T = unknown>(table: string): Promise<T[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to export ${table}: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<T[]>;
}

const outputDir = join(process.cwd(), "server", "tmp");
await mkdir(outputDir, { recursive: true });

const [accounts, transactions] = await Promise.all([
  fetchTable("accounts"),
  fetchTable("transactions"),
]);

const output = {
  exportedAt: new Date().toISOString(),
  accounts,
  transactions,
};

const filename = join(outputDir, `supabase-export-${Date.now()}.json`);
await writeFile(filename, JSON.stringify(output, null, 2), "utf8");

console.log(`Exported ${accounts.length} accounts and ${transactions.length} transactions to ${filename}`);
