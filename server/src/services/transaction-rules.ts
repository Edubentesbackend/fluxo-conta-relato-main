import { badRequest } from "../utils/errors.js";

export interface BasicTransactionRuleInput {
  sourceAccountId: string;
  destinationAccountId: string;
  transactionDate: Date;
  amount: number;
}

export function validateBasicTransactionRules(input: BasicTransactionRuleInput) {
  if (input.sourceAccountId === input.destinationAccountId) {
    throw badRequest("A conta de origem deve ser diferente da conta de destino");
  }

  if (Number.isNaN(input.transactionDate.getTime())) {
    throw badRequest("Data da transacao invalida");
  }

  if (input.transactionDate.getTime() > Date.now() + 60_000) {
    throw badRequest("A data da transacao nao pode ser futura");
  }

  if (input.amount <= 0) {
    throw badRequest("Valor deve ser maior que zero");
  }
}

export function getLoanStatus(loanAmount: number, returnedAmount: number) {
  if (returnedAmount >= loanAmount) return "fully_returned";
  if (returnedAmount > 0) return "partially_returned";
  return "pending_return";
}
