import type { AccountType } from "@prisma/client";
import { ADM_ACCOUNT_NUMBER } from "../constants/index.js";
import { badRequest } from "../utils/errors.js";

export function resolveAccountType(accountNumber: string, requestedType?: AccountType | null): AccountType {
  if (accountNumber === ADM_ACCOUNT_NUMBER) return "adm";

  if (requestedType === "adm") {
    throw badRequest(`Somente a conta ${ADM_ACCOUNT_NUMBER} pode ser classificada como ADM`);
  }

  return requestedType ?? "projeto";
}
