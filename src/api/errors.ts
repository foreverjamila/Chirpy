

export class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class UserBadRequestError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class UserUnAuthorizedError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class UserForbiddenError extends Error {
    constructor(message: string) {
        super(message);
    }
}