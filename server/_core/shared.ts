import { z } from "zod";
import { desc, like } from "drizzle-orm";
import { members } from "../../drizzle/schema";

// Standard pagination input schema
export const paginationInput = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(10000).default(20),
});

// Shared helper to generate unique membership numbers
export async function generateMembershipNumber(tx: any): Promise<string> {
  const latestMembers = await tx
    .select({ membershipNumber: members.membershipNumber })
    .from(members)
    .where(like(members.membershipNumber, 'MBR-%'))
    .orderBy(desc(members.id))
    .limit(1);

  let nextNumber = 1;
  if (latestMembers.length > 0 && latestMembers[0].membershipNumber) {
    const match = latestMembers[0].membershipNumber.match(/MBR-(\d+)/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  return `MBR-${String(nextNumber).padStart(6, '0')}`;
}

// Decimal parser helper
export function parseDecimal(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// Standardized Date schema/transformer
export const dateInputSchema = z.union([z.date(), z.string()]).transform((val) => {
  if (val instanceof Date) return val;
  const parsed = new Date(val);
  if (isNaN(parsed.getTime())) {
    throw new Error("Invalid date format");
  }
  return parsed;
});

// Escape characters used as wildcards in SQL LIKE queries
export function escapeLikePattern(val: string): string {
  return val.replace(/[%_\\]/g, "\\$&");
}
