import { Router, Request, Response } from "express";
import {
  createWaitlistEntry,
  getWaitlistEntries,
  getWaitlistPosition,
} from "./services/waitlist-router-service";

const router = Router();

router.post("/api/waitlist", async (req: Request, res: Response) => {
  console.log("req.body", req.body);
  await createWaitlistEntry(req, res);
});

router.get("/api/waitlist", async (_req, res) => {
  await getWaitlistEntries(_req, res);
});

router.get("/api/waitlist/position", async (req, res) => {
  await getWaitlistPosition(req, res);
});

export default router;
