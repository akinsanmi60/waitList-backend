import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  squareFeet: integer("square_feet").notNull(),
  propertyType: text("property_type").notNull(), // apartment, house, condo, etc.
  listingType: text("listing_type").notNull(), // sale, rent
  yearBuilt: integer("year_built"),
  features: text("features").array(),
  images: text("images").array(),
  status: text("status").notNull().default("active"), // active, pending, sold
  agentId: integer("agent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  photo: text("photo"),
  bio: text("bio"),
  licenseNumber: text("license_number").notNull().unique(),
  specializations: text("specializations").array(),
  languages: text("languages").array(),
  agencyId: integer("agency_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  propertyId: integer("property_id"),
  agentId: integer("agent_id"),
  status: text("status").notNull().default("new"), // new, contacted, closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Adding a new table for waitlist/form submissions
export const realtorWaitlistEntries = pgTable("realtor_waitlist_entries", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  companyName: text("company_name"),
  propertyCount: text("property_count").notNull(),
  referralSource: text("referral_source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
});

export const insertRealtorWaitlistSchema = createInsertSchema(
  realtorWaitlistEntries
).omit({
  id: true,
  createdAt: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const realtorWaitlistSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  companyName: z.string().optional(),
  propertyCount: z.string().min(1, "Please select the number of properties"),
  referralSource: z.string().optional(),
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertRealtorWaitlist = z.infer<typeof insertRealtorWaitlistSchema>;
export type RealtorWaitlistEntry = typeof realtorWaitlistEntries.$inferSelect;

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;
