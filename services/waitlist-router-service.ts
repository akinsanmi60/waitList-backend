import { randomBytes } from "crypto";
import { sendWaitlist } from "../mailers/senders";
import { insertWaitlistSchema } from "../shared/schema";
import { storage } from "../storage";
import { Request, Response } from "express";
import { ZodError } from "zod";

/**
 * Handles sending waitlist emails and logs errors if they occur.
 */
const sendWelcomeEmail = async (email: string, data: { name: string }) => {
  try {
    await sendWaitlist({ to: email, data });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
};

/**
 * Handles validation and creation of waitlist entries.
 */
export const createWaitlistEntry = async (req: Request, res: Response) => {
  try {
    const entry = insertWaitlistSchema.parse(req.body);
    const referralCode = randomBytes(4).toString("hex").toUpperCase();
    const referredBy = req.query.ref as string;

    const result = await storage.createWaitlistEntry({
      ...entry,
      referralCode,
      referredBy,
    });

    const total = await storage.getWaitlistCount();

    // Send welcome email (non-blocking)
    await sendWelcomeEmail(entry.email, { name: entry.name });

    res.status(201).json({
      success: true,
      data: { ...result, total },
      message: "Successfully joined the waitlist!",
    });
  } catch (error) {
    handleWaitlistError(error, res);
  }
};

/**
 * Handles fetching all waitlist entries.
 */
export const getWaitlistEntries = async (_req: Request, res: Response) => {
  try {
    const entries = await storage.getWaitlistEntries();
    res.json(entries);
  } catch (error) {
    console.error("Error fetching waitlist:", error);
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Server error occurred while fetching waitlist entries",
    });
  }
};

/**
 * Handles fetching a user's waitlist position and referral details.
 */
export const getWaitlistPosition = async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "MISSING_EMAIL",
        message: "Email is required",
      });
    }

    const position = await storage.getWaitlistPosition(email);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "User not found in waitlist",
      });
    }

    const total = await storage.getWaitlistCount();
    const referralCount = await storage.getReferralCount(position.referralCode);

    res.json({
      success: true,
      data: {
        position: position.position,
        total,
        referralCode: position.referralCode,
        referralCount,
        milestones: position.milestones,
      },
    });
  } catch (error) {
    console.error("Error fetching position:", error);
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "An unexpected error occurred while fetching your position",
    });
  }
};

/**
 * Centralized error handler for waitlist-related errors.
 */
const handleWaitlistError = (error: unknown, res: Response) => {
  console.error("Waitlist error:", error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "Please check your input and try again",
      details: error.errors,
    });
  }

  if (error instanceof Error && "code" in error && error.code === "23505") {
    return res.status(409).json({
      success: false,
      error: "DUPLICATE_ENTRY",
      message: "This email is already registered for the waitlist",
    });
  }

  res.status(500).json({
    success: false,
    error: "SERVER_ERROR",
    message: "An unexpected error occurred. Please try again later.",
  });
};
