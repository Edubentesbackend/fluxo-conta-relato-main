export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "API_ERROR",
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST") =>
  new ApiError(400, message, code);

export const unauthorized = (message = "Nao autenticado") =>
  new ApiError(401, message, "UNAUTHORIZED");

export const forbidden = (message = "Acesso negado") =>
  new ApiError(403, message, "FORBIDDEN");

export const notFound = (message: string) =>
  new ApiError(404, message, "NOT_FOUND");
