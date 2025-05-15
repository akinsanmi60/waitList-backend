import { realtorWaitlistSchema } from "../shared/supplierSchema";
import { storage } from "../supplierStorage";
import { Request, Response } from "express";

export const createRealtorWaitlistEntry = async (
  req: Request,
  res: Response
) => {
  try {
    const waitlistData = realtorWaitlistSchema.parse(req.body);

    const entry = await storage.createRealtorWaitlistEntry(waitlistData);

    return res.status(201).json({
      success: true,
      message:
        "Your information has been added to our waitlist. We'll be in touch soon!",
      entry,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        "There was an issue submitting your information. Please check your data and try again.",
      error,
    });
  }
};

export const getRealtorWaitlistEntries = async (
  req: Request,
  res: Response
) => {
  try {
    const entries = await storage.getRealtorWaitlistEntries();
    return res.status(200).json(entries);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to retrieve waitlist entries" });
  }
};
