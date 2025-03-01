import { ZodError } from "zod";
import { Request, Response } from "express";
import { sendContactUsReply } from "../mailers/senders";
import { contactFormSchema } from "../shared/schema";
import { storage } from "../storage";

export const contactUsServices = async (req: Request, res: Response) => {
  try {
    const data = contactFormSchema.parse(req.body);

    await storage.createContactUsReply(data);

    await sendContactUsReply({
      to: data.email,
      data: { name: data.name },
    });

    res.status(200).json({
      success: true,
      message: "Thank you for your message. We'll get back to you soon!",
    });
  } catch (error) {
    console.error("Contact form error:", error);

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Please check your input and try again",
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};
