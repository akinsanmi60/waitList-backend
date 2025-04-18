import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  isAdmin: integer("is_admin").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  position: integer("position"), // Made nullable by removing .notNull()
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  referralCount: integer("referral_count").notNull().default(0),
  pointsEarned: integer("points_earned").notNull().default(0),
  milestones: json("milestones").$type<string[]>().default([]),
  notificationPreferences: json("notification_preferences")
    .$type<{
      email: boolean;
      webhook: boolean;
      webhookUrl?: string;
    }>()
    .default({ email: true, webhook: false }),
  lastPositionUpdate: timestamp("last_position_update"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for inserting new waitlist entries
export const insertWaitlistSchema = createInsertSchema(waitlist)
  .pick({
    name: true,
    email: true,
  })
  .extend({
    email: z.string().email("Please enter a valid email address"),
    name: z.string().min(2, "Name must be at least 2 characters"),
  });

// Type for insert operations
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;

// Type for database records
export type Waitlist = typeof waitlist.$inferSelect;

// Type for waitlist position response
export const waitlistPositionSchema = z.object({
  position: z.number().nullable(),
  total: z.number(),
  referralCode: z.string(),
  referralCount: z.number(),
  pointsEarned: z.number(),
  milestones: z.array(z.string()),
});

export type WaitlistPosition = z.infer<typeof waitlistPositionSchema>;

// Position boosting rules
export const REFERRAL_POINTS = 100;
export const SOCIAL_SHARE_POINTS = 50;
export const MILESTONE_POINTS = 200;
export const WAITLIST_POSITION_THRESHOLD = 150;

// Milestone definitions
export const MILESTONES = {
  EARLY_BIRD: "early_bird",
  FIRST_REFERRAL: "first_referral",
  FIVE_REFERRALS: "five_referrals",
  TEN_REFERRALS: "ten_referrals",
  TOP_HUNDRED: "top_hundred",
} as const;

export const contactUs = pgTable("contact_us", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  consent: boolean("consent").notNull(),
});

export const contactFormSchema = createInsertSchema(contactUs)
  .pick({
    name: true,
    email: true,
    message: true,
    consent: true,
  })
  .extend({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    message: z.string().min(10, "Message must be at least 10 characters"),
    consent: z.boolean(),
  });

export type ContactFormValues = z.infer<typeof contactFormSchema>;

// Schema for inserting new users
export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    email: true,
    isAdmin: true,
  })
  .extend({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    email: z.string().email("Please enter a valid email address"),
    isAdmin: z.number().optional().default(0),
  });

// Type for insert operations
export type InsertUser = z.infer<typeof insertUserSchema>;

// Type for database records
export type User = typeof users.$inferSelect;
