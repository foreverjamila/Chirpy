import * as argon2 from "argon2";

export async function hashPassword(password: string): Promise<string> {
    const hash = await argon2.hash(password);
    return hash;
}

export async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
    try {
        return await argon2.verify(hash, password);
    } catch {
        // A stored hash argon2 cannot parse — "unset", or anything else
        // unusable — must never authenticate anyone. The assignment asks
        // for 401 when the comparison errors, so a failed comparison is
        // reported as "does not match" rather than thrown.
        return false;
    }
}
