import { badRequest } from "../utils/errors.js";

const COORDINATOR_NAME_PATTERN = /^[\p{L}\s]+$/u;

export function normalizeAccountNumber(input: string) {
  const value = input.trim();
  const digits = value.replace(/\D/g, "");

  if (digits.length < 2 || (value !== digits && !/^\d+-\d$/.test(value))) {
    throw badRequest("Numero da conta deve conter apenas numeros e um digito final");
  }

  return `${digits.slice(0, -1)}-${digits.slice(-1)}`;
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
