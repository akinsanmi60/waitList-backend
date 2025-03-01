import { Router, Request, Response } from "express";
import {
  createWaitlistEntry,
  getWaitlistEntries,
  getWaitlistPosition,
} from "./services/waitlist-router-service";

import { contactUsServices } from "./services/contact-router-service";

const router = Router();

router.post("/api/waitlist", async (req: Request, res: Response) => {
  await createWaitlistEntry(req, res);
});

router.get("/api/waitlist", async (_req, res) => {
  await getWaitlistEntries(_req, res);
});

router.get("/api/waitlist/position", async (req, res) => {
  await getWaitlistPosition(req, res);
});

router.post("/api/contact-us", async (req, res) => {
  await contactUsServices(req, res);
});

export default router;
