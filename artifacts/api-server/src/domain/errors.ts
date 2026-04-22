export class DomainError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "DomainError";
  }
}
export class UnauthorizedError extends DomainError {
  constructor(msg = "Não autorizado") { super(msg, 401); this.name = "UnauthorizedError"; }
}
export class ForbiddenError extends DomainError {
  constructor(msg = "Acesso negado") { super(msg, 403); this.name = "ForbiddenError"; }
}
export class NotFoundError extends DomainError {
  constructor(msg = "Não encontrado") { super(msg, 404); this.name = "NotFoundError"; }
}
export class ValidationError extends DomainError {
  constructor(msg = "Dados inválidos") { super(msg, 422); this.name = "ValidationError"; }
}
export class ConflictError extends DomainError {
  constructor(msg = "Conflito") { super(msg, 409); this.name = "ConflictError"; }
}
