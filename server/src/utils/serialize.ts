import type { Account, Transaction } from "@prisma/client";

type AccountLike = Pick<Account, "id" | "name" | "description" | "accountNumber" | "createdAt" | "updatedAt">;

export function serializeAccount(account: AccountLike) {
  return {
    id: account.id,
    name: account.name,
    description: account.description,
    account_number: account.accountNumber,
    created_at: account.createdAt.toISOString(),
    updated_at: account.updatedAt.toISOString(),
  };
}

export function serializeTransaction(
  transaction: Transaction & {
    sourceAccount?: AccountLike;
    destinationAccount?: AccountLike;
  },
) {
  return {
    id: transaction.id,
    unique_identifier: transaction.uniqueIdentifier,
    source_account_id: transaction.sourceAccountId,
    destination_account_id: transaction.destinationAccountId,
    transaction_date: transaction.transactionDate.toISOString(),
    amount: Number(transaction.amount),
    transaction_type: transaction.transactionType,
    description: transaction.description,
    created_at: transaction.createdAt.toISOString(),
    updated_at: transaction.updatedAt.toISOString(),
    parent_transaction_id: transaction.parentTransactionId,
    status: transaction.status,
    source_account_name: transaction.sourceAccount?.name,
    destination_account_name: transaction.destinationAccount?.name,
  };
}

export function positionFromBalance(balance: number): "devedora" | "credora" | "equilibrada" {
  if (balance > 0) return "devedora";
  if (balance < 0) return "credora";
  return "equilibrada";
}
