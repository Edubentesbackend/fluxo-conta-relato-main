import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Prisma, PrismaClient, type TransactionStatus, type TransactionType } from "@prisma/client";

const prisma = new PrismaClient();
const inputFile = process.argv[2];

if (!inputFile) {
  throw new Error("Usage: npm run supabase:import -- <path-to-export.json>");
}

interface SupabaseExport {
  accounts: Array<{
    id: string;
    name: string;
    account_number?: string | null;
    description?: string | null;
    created_at: string;
    updated_at: string;
  }>;
  transactions: Array<{
    id: string;
    unique_identifier: string;
    source_account_id: string;
    destination_account_id: string;
    transaction_date: string;
    amount: string | number;
    transaction_type: TransactionType;
    description: string;
    parent_transaction_id?: string | null;
    status?: TransactionStatus;
    created_at: string;
    updated_at: string;
  }>;
}

function assertNoDuplicates(values: Array<string | null | undefined>, label: string) {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

const raw = await readFile(inputFile, "utf8");
const data = JSON.parse(raw) as SupabaseExport;

assertNoDuplicates(data.accounts.map((account) => account.id), "account id");
assertNoDuplicates(data.accounts.map((account) => account.account_number), "account number");
assertNoDuplicates(data.transactions.map((transaction) => transaction.id), "transaction id");
assertNoDuplicates(data.transactions.map((transaction) => transaction.unique_identifier), "transaction identifier");

const accountIds = new Set(data.accounts.map((account) => account.id));
for (const transaction of data.transactions) {
  if (!accountIds.has(transaction.source_account_id)) {
    throw new Error(`Missing source account ${transaction.source_account_id} for transaction ${transaction.id}`);
  }
  if (!accountIds.has(transaction.destination_account_id)) {
    throw new Error(`Missing destination account ${transaction.destination_account_id} for transaction ${transaction.id}`);
  }
}

await prisma.$transaction(async (tx) => {
  await tx.transaction.deleteMany();
  await tx.account.deleteMany();

  await tx.account.createMany({
    data: data.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      accountNumber: account.account_number || null,
      description: account.description || null,
      createdAt: new Date(account.created_at),
      updatedAt: new Date(account.updated_at),
    })),
  });

  await tx.transaction.createMany({
    data: data.transactions.map((transaction) => ({
      id: transaction.id,
      uniqueIdentifier: transaction.unique_identifier,
      sourceAccountId: transaction.source_account_id,
      destinationAccountId: transaction.destination_account_id,
      transactionDate: new Date(transaction.transaction_date),
      amount: new Prisma.Decimal(transaction.amount),
      transactionType: transaction.transaction_type,
      description: transaction.description,
      parentTransactionId: transaction.parent_transaction_id || null,
      status: transaction.status || "completed",
      createdAt: new Date(transaction.created_at),
      updatedAt: new Date(transaction.updated_at),
    })),
  });
});

const transactionCount = await prisma.transaction.count();
const accountCount = await prisma.account.count();
const totalsByType = await prisma.transaction.groupBy({
  by: ["transactionType"],
  _sum: { amount: true },
  _count: true,
});

console.log(`Imported ${accountCount} accounts and ${transactionCount} transactions.`);
console.table(totalsByType.map((row) => ({
  type: row.transactionType,
  count: row._count,
  total: row._sum.amount?.toString() || "0",
})));

await prisma.$disconnect();
