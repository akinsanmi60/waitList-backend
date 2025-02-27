import {
  waitlist,
  type Waitlist,
  type InsertWaitlist,
  WAITLIST_POSITION_THRESHOLD,
} from "./shared/schema";
import { DB } from "./dbConfig";
import { desc, eq, sql } from "drizzle-orm";

export interface IStorage {
  createWaitlistEntry(
    entry: InsertWaitlist & { referralCode: string; referredBy?: string }
  ): Promise<Waitlist>;
  getWaitlistEntries(): Promise<Waitlist[]>;
  getWaitlistPosition(email: string): Promise<Waitlist | null>;
  getWaitlistCount(): Promise<number>;
  getReferralCount(referralCode: string): Promise<number>;
  updatePosition(userId: number, newPosition: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createWaitlistEntry(
    entry: InsertWaitlist & { referralCode: string; referredBy?: string }
  ): Promise<Waitlist> {
    try {
      // Start a transaction to ensure position assignment is atomic
      return await DB.transaction(async (tx) => {
        // check if the email is already in the waitlist
        const existingEntry = await tx.query.waitlist.findFirst({
          where: eq(waitlist.email, entry.email),
        });

        if (existingEntry) {
          throw new Error("This email is already registered for the waitlist");
        }

        // Get current count to determine if we should assign positions
        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(waitlist);

        let position = null;

        // Only assign position if we've reached the threshold
        if (count >= WAITLIST_POSITION_THRESHOLD - 1) {
          // -1 because current entry isn't counted yet
          position = count + 1;

          // If this is exactly the threshold entry, we need to assign positions to all previous entries
          if (count === WAITLIST_POSITION_THRESHOLD - 1) {
            // Assign positions 1 through threshold-1 to existing entries
            await tx.update(waitlist).set({
              position: sql`row_number() over (order by "created_at" asc)`,
              lastPositionUpdate: new Date(),
            });
          }
        }

        // Create the new entry
        const [waitlistEntry] = await tx
          .insert(waitlist)
          .values({
            ...entry,
            position,
            referralCode: entry.referralCode,
            referredBy: entry.referredBy,
          })
          .returning();

        return waitlistEntry;
      });
    } catch (error) {
      console.error("Database error in createWaitlistEntry:", error);
      throw error;
    }
  }

  async getWaitlistEntries(): Promise<Waitlist[]> {
    try {
      return await DB.select().from(waitlist).orderBy(desc(waitlist.createdAt));
    } catch (error) {
      console.error("Database error in getWaitlistEntries:", error);
      return [];
    }
  }

  async getWaitlistPosition(email: string): Promise<Waitlist | null> {
    try {
      const [entry] = await DB.select()
        .from(waitlist)
        .where(eq(waitlist.email, email));

      return entry || null;
    } catch (error) {
      console.error("Database error in getWaitlistPosition:", error);
      return null;
    }
  }

  async getWaitlistCount(): Promise<number> {
    try {
      const [{ count }] = await DB.select({
        count: sql<number>`count(*)`,
      }).from(waitlist);

      return count;
    } catch (error) {
      console.error("Database error in getWaitlistCount:", error);
      return 0;
    }
  }

  async getReferralCount(referralCode: string): Promise<number> {
    try {
      const [{ count }] = await DB.select({ count: sql<number>`count(*)` })
        .from(waitlist)
        .where(eq(waitlist.referredBy, referralCode));

      return count;
    } catch (error) {
      console.error("Database error in getReferralCount:", error);
      return 0;
    }
  }

  async updatePosition(userId: number, newPosition: number): Promise<void> {
    try {
      await DB.update(waitlist)
        .set({
          position: newPosition,
          lastPositionUpdate: new Date(),
        })
        .where(eq(waitlist.id, userId));
    } catch (error) {
      console.error("Database error in updatePosition:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
