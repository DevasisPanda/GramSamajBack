import type { User } from "../../drizzle/schema";

export type SafeUser = Pick<User, "id" | "email" | "name" | "phone" | "role" | "status" | "profileImage" | "bio"> & {
  isSystemAdmin?: boolean;
};

/**
 * Strips sensitive fields (like passwordHash, Aadhaar, full address) from the user object
 * before returning it to the client.
 */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    status: user.status,
    profileImage: user.profileImage,
    bio: user.bio,
    isSystemAdmin: Boolean(user.isSystemAdmin),
  };
}

/**
 * Strips ONLY the passwordHash for admin-level responses.
 * Admins are allowed to see PII (phone, address, Aadhaar), but never password hashes.
 */
export function excludePassword<T extends { passwordHash?: string | null; email?: string | null; isSystemAdmin?: boolean | null }>(user: T): Omit<T, 'passwordHash'> & { isSystemAdmin?: boolean } {
  const { passwordHash, ...rest } = user;
  return {
    ...rest,
    isSystemAdmin: Boolean(user.isSystemAdmin),
  };
}

