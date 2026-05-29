import { badRequest } from "../utils/errors.js";

const COORDINATOR_NAME_PATTERN = /^[\p{L}\s]+$/u;
const ACCOUNT_NUMBER_WITH_DIGIT_PATTERN = /^\d+[\dX]$/;
const FORMATTED_ACCOUNT_NUMBER_PATTERN = /^\d+-[\dX]$/;

export function normalizeAccountNumber(input: string) {
  const value = input.trim().toUpperCase();
  const compact = value.replace(/-/g, "");

  if (
    !ACCOUNT_NUMBER_WITH_DIGIT_PATTERN.test(compact) ||
    (value.includes("-") && !FORMATTED_ACCOUNT_NUMBER_PATTERN.test(value))
  ) {
    throw badRequest("Numero da conta deve conter numeros e digito final numerico ou X");
  }

  return `${compact.slice(0, -1)}-${compact.slice(-1)}`;
}

export function normalizeCoordinatorSearchName(input: string) {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

export function formatCoordinatorName(input: string) {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1).toLocaleLowerCase("pt-BR"))
    .join(" ");
}

export function normalizeCoordinatorName(input: string) {
  const name = formatCoordinatorName(input);

  if (!name || !COORDINATOR_NAME_PATTERN.test(name)) {
    throw badRequest("Nome do coordenador deve conter somente letras e espacos");
  }

  return {
    name,
    normalizedName: normalizeCoordinatorSearchName(name),
  };
}
