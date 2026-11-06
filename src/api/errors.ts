
// 404
export class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}
// 400
export class UserBadRequestError extends Error {
    constructor(message: string) {
        super(message);
    }
}
// 401
export class UserUnAuthorizedError extends Error {
    constructor(message: string) {
        super(message);
    }
}
// 403
export class UserForbiddenError extends Error {
    constructor(message: string) {
        super(message);
    }
}