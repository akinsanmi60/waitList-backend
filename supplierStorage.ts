import {
  type Property,
  type InsertProperty,
  type Agent,
  type InsertAgent,
  type Inquiry,
  type RealtorWaitlistEntry,
  type InsertRealtorWaitlist,
  InsertInquiry,
  properties,
  agents,
  inquiries,
  realtorWaitlistEntries,
} from "./shared/supplierSchema";
import { DB, pool } from "./dbConfig";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { desc, eq, sql } from "drizzle-orm";
import { waitlist } from "./shared/schema";

// Create session stores
const PgSessionStore = connectPgSimple(session);
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Property methods
  getProperties(): Promise<Property[]>;
  getPropertyById(id: number): Promise<Property | undefined>;
  getPropertiesByAgent(agentId: number): Promise<Property[]>;
  getPropertiesByType(propertyType: string): Promise<Property[]>;
  getPropertiesByStatus(status: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updatePropertyStatus(
    id: number,
    status: string
  ): Promise<Property | undefined>;
  updateProperty(
    id: number,
    property: Partial<InsertProperty>
  ): Promise<Property | undefined>;

  // Agent methods
  getAgents(): Promise<Agent[]>;
  getAgentById(id: number): Promise<Agent | undefined>;
  getAgentByEmail(email: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;

  // Inquiry methods
  getInquiries(): Promise<Inquiry[]>;
  getInquiryById(id: number): Promise<Inquiry | undefined>;
  getInquiriesByProperty(propertyId: number): Promise<Inquiry[]>;
  getInquiriesByAgent(agentId: number): Promise<Inquiry[]>;
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  updateInquiryStatus(id: number, status: string): Promise<Inquiry | undefined>;

  // Waitlist methods
  getRealtorWaitlistEntries(): Promise<RealtorWaitlistEntry[]>;
  createRealtorWaitlistEntry(
    entry: InsertRealtorWaitlist
  ): Promise<RealtorWaitlistEntry>;
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

    // Create default admin user
  }

  // Property methods
  async getProperties(): Promise<Property[]> {
    try {
      return await DB.select()
        .from(properties)
        .orderBy(desc(properties.createdAt));
    } catch (error) {
      console.error("Database error in getProperties:", error);
      return [];
    }
  }

  async getPropertyById(id: number): Promise<Property | undefined> {
    try {
      const [property] = await DB.select()
        .from(properties)
        .where(eq(properties.id, id));
      return property;
    } catch (error) {
      console.error("Database error in getPropertyById:", error);
      return undefined;
    }
  }

  async getPropertiesByAgent(agentId: number): Promise<Property[]> {
    try {
      return await DB.select()
        .from(properties)
        .where(eq(properties.agentId, agentId));
    } catch (error) {
      console.error("Database error in getPropertiesByAgent:", error);
      return [];
    }
  }

  async getPropertiesByType(propertyType: string): Promise<Property[]> {
    try {
      return await DB.select()
        .from(properties)
        .where(eq(properties.propertyType, propertyType));
    } catch (error) {
      console.error("Database error in getPropertiesByType:", error);
      return [];
    }
  }

  async getPropertiesByStatus(status: string): Promise<Property[]> {
    try {
      return await DB.select()
        .from(properties)
        .where(eq(properties.status, status));
    } catch (error) {
      console.error("Database error in getPropertiesByStatus:", error);
      return [];
    }
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const property: Omit<Property, "id"> = {
      ...insertProperty,
      status: "active",
      agentId: insertProperty.agentId || null,
      yearBuilt: insertProperty.yearBuilt || null,
      features: insertProperty.features || null,
      images: insertProperty.images || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const [newProperty] = await DB.insert(properties)
        .values(property)
        .returning();

      return newProperty;
    } catch (error) {
      console.error("Database error in createProperty:", error);
      throw error;
    }
  }

  async updatePropertyStatus(id: number, status: string): Promise<Property> {
    try {
      const property = await DB.select()
        .from(properties)
        .where(eq(properties.id, id));
      if (!property) {
        throw new Error(`Property with ID ${id} not found`);
      }
      const updatedProperty = await DB.update(properties)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(properties.id, id))
        .returning();
      return updatedProperty[0];
    } catch (error) {
      console.error("Database error in updatePropertyStatus:", error);
      throw error;
    }
  }

  async updateProperty(
    id: number,
    propertyUpdate: Partial<InsertProperty>
  ): Promise<Property | undefined> {
    try {
      const property = await DB.select()
        .from(properties)
        .where(eq(properties.id, id));
      if (!property) {
        throw new Error(`Property with ID ${id} not found`);
      }
      const updatedProperty = await DB.update(properties)
        .set({
          ...propertyUpdate,
          updatedAt: new Date(),
        })
        .where(eq(properties.id, id))
        .returning();
      return updatedProperty[0];
    } catch (error) {
      console.error("Database error in updateProperty:", error);
      throw error;
    }
  }

  // Agent methods
  async getAgents(): Promise<Agent[]> {
    try {
      return await DB.select().from(agents).orderBy(desc(agents.createdAt));
    } catch (error) {
      console.error("Database error in getAgents:", error);
      return [];
    }
  }

  async getAgentById(id: number): Promise<Agent | undefined> {
    try {
      const [agent] = await DB.select().from(agents).where(eq(agents.id, id));
      return agent;
    } catch (error) {
      console.error("Database error in getAgentById:", error);
      return undefined;
    }
  }

  async getAgentByEmail(email: string): Promise<Agent | undefined> {
    try {
      const [agent] = await DB.select()
        .from(agents)
        .where(eq(agents.email, email));
      return agent;
    } catch (error) {
      console.error("Database error in getAgentByEmail:", error);
      return undefined;
    }
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const agent: Omit<Agent, "id"> = {
      ...insertAgent,
      photo: insertAgent.photo || null,
      bio: insertAgent.bio || null,
      specializations: insertAgent.specializations || null,
      languages: insertAgent.languages || null,
      agencyId: insertAgent.agencyId || null,
      createdAt: new Date(),
    };

    try {
      const [newAgent] = await DB.insert(agents).values(agent).returning();

      return newAgent;
    } catch (error) {
      console.error("Database error in createAgent:", error);
      throw error;
    }
  }

  // Inquiry methods
  async getInquiries(): Promise<Inquiry[]> {
    try {
      return await DB.select()
        .from(inquiries)
        .orderBy(desc(inquiries.createdAt));
    } catch (error) {
      console.error("Database error in getInquiries:", error);
      return [];
    }
  }

  async getInquiryById(id: number): Promise<Inquiry> {
    try {
      const [inquiry] = await DB.select()
        .from(inquiries)
        .where(eq(inquiries.id, id));
      return inquiry;
    } catch (error) {
      console.error("Database error in getInquiryById:", error);
      throw error;
    }
  }

  async getInquiriesByProperty(propertyId: number): Promise<Inquiry[]> {
    try {
      const fetchedInquiries = await DB.select()
        .from(inquiries)
        .where(eq(inquiries.propertyId, propertyId));
      return fetchedInquiries;
    } catch (error) {
      console.error("Database error in getInquiriesByProperty:", error);
      return [];
    }
  }

  async getInquiriesByAgent(agentId: number): Promise<Inquiry[]> {
    try {
      const fetchedInquiries = await DB.select()
        .from(inquiries)
        .where(eq(inquiries.agentId, agentId));
      return fetchedInquiries;
    } catch (error) {
      console.error("Database error in getInquiriesByAgent:", error);
      return [];
    }
  }

  async createInquiry(insertInquiry: InsertInquiry): Promise<Inquiry> {
    const inquiry: Omit<Inquiry, "id"> = {
      ...insertInquiry,
      status: "new",
      agentId: insertInquiry.agentId || null,
      propertyId: insertInquiry.propertyId || null,
      phone: insertInquiry.phone || null,
      createdAt: new Date(),
    };

    console.log(inquiry, "+++++++++++++++++++++++");

    try {
      const [newInquiry] = await DB.insert(inquiries)
        .values(inquiry)
        .returning();
      return newInquiry;
    } catch (error) {
      console.error("Database error in createInquiry:", error);
      throw error;
    }
  }

  async updateInquiryStatus(id: number, status: string): Promise<Inquiry> {
    const inquiry = await DB.select()
      .from(inquiries)
      .where(eq(inquiries.id, id));

    if (!inquiry) {
      throw new Error(`Inquiry with ID ${id} not found`);
    }

    try {
      const updatedInquiry = await DB.update(inquiries)
        .set({
          status,
        })
        .where(eq(inquiries.id, id))
        .returning();
      return updatedInquiry[0];
    } catch (error) {
      console.error("Database error in updateInquiryStatus:", error);
      throw error;
    }
  }

  // Waitlist methods
  async getRealtorWaitlistEntries(): Promise<RealtorWaitlistEntry[]> {
    try {
      return await DB.select().from(realtorWaitlistEntries);
    } catch (error) {
      console.error("Database error in getRealtorWaitlistEntries:", error);
      return [];
    }
  }

  async createRealtorWaitlistEntry(
    insertEntry: InsertRealtorWaitlist
  ): Promise<RealtorWaitlistEntry> {
    const entry: Omit<RealtorWaitlistEntry, "id"> = {
      ...insertEntry,
      companyName: insertEntry.companyName || null,
      referralSource: insertEntry.referralSource || null,
      createdAt: new Date(),
    };

    try {
      const [newEntry] = await DB.insert(realtorWaitlistEntries)
        .values(entry)
        .returning();
      return newEntry;
    } catch (error) {
      console.error("Database error in createRealtorWaitlistEntry:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
