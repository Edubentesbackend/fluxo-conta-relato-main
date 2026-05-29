import type { Account, Transaction } from "@prisma/client";

type CoordinatorLike = {
  id: string;
  name: string;
  normalizedName?: string;
};

type AccountLike = Pick<
  Account,
  "id" | "name" | "description" | "accountNumber" | "coordinatorId" | "createdAt" | "updatedAt"
> & {
  coordinator?: CoordinatorLike | null;
};

export function serializeAccount(account: AccountLike) {
  return {
    id: account.id,
    name: account.name,
    description: account.description,
    account_number: account.accountNumber,
    coordinator_id: account.coordinatorId,
    coordinator_name: account.coordinator?.name ?? null,
    coordinator: account.coordinator
      ? {
          id: account.coordinator.id,
          name: account.coordinator.name,
          normalized_name: account.coordinator.normalizedName,
        }
      : null,
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
    source_account_number: transaction.sourceAccount?.accountNumber,
    source_account_coordinator_name: transaction.sourceAccount?.coordinator?.name,
    destination_account_name: transaction.destinationAccount?.name,
    destination_account_number: transaction.destinationAccount?.accountNumber,
    destination_account_coordinator_name: transaction.destinationAccount?.coordinator?.name,
  };
}

export function positionFromBalance(balance: number): "devedora" | "credora" | "equilibrada" {
  if (balance > 0) return "devedora";
  if (balance < 0) return "credora";
  return "equilibrada";
}
