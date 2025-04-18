import {
  waitlist,
  type Waitlist,
  type InsertWaitlist,
  ContactFormValues,
  contactUs,
  users,
  User,
  InsertUser,
} from "./shared/schema";
import { DB, pool } from "./dbConfig";
import { desc, eq, sql } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import createMemoryStore from "memorystore";

// Create session stores
const PgSessionStore = connectPgSimple(session);
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  createWaitlistEntry(
    entry: InsertWaitlist & { referralCode: string; referredBy?: string }
  ): Promise<Waitlist>;
  getWaitlistEntries(): Promise<Waitlist[]>;
  getWaitlistPosition(email: string): Promise<Waitlist | null>;
  getWaitlistCount(): Promise<number>;
  getReferralCount(referralCode: string): Promise<number>;
  updatePosition(userId: number, newPosition: number): Promise<void>;
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    try {
      // Try using PostgreSQL for session storage
      this.sessionStore = new PgSessionStore({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      });
      console.log("Using PostgreSQL for session storage");
    } catch (error) {
      // Fallback to memory store if there's an issue
      console.warn(
        "Failed to initialize PostgreSQL session store, falling back to memory store:",
        error
      );
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      });
      console.log("Using in-memory session storage");
    }
  }
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

        // Get the current count correctly
        const countResult = await tx
          .select({ count: sql<number>`COUNT(*)` }) // Ensure COUNT(*) is properly extracted
          .from(waitlist);

        const count = countResult[0]?.count ?? 0; // Extract the count properly

        // Always assign a position (count + 1)
        const position = Number(count) + 1;

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

  async createContactUsReply(data: ContactFormValues) {
    try {
      await DB.insert(contactUs).values(data);
    } catch (error) {
      console.error("Database error in createContactUsReply:", error);
      throw error;
    }
  }

  // User operations
  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await DB.insert(users).values(user).returning();
      return newUser;
    } catch (error) {
      console.error("Database error in createUser:", error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await DB.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Database error in getUser:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await DB.select()
        .from(users)
        .where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Database error in getUserByUsername:", error);
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();
