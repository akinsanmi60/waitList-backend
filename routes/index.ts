import { Router, Request, Response } from "express";
import {
  createWaitlistEntry,
  getWaitlistEntries,
  getWaitlistPosition,
} from "../services/waitlist-router-service";

import { contactUsServices } from "../services/contact-router-service";
import {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  updatePropertyStatus,
} from "../services/property-router-service";
import {
  createAgent,
  getAgentById,
  getAgents,
} from "../services/agent-router-service";
import {
  createInquiry,
  exportInquiriesToCSV,
  getInquiries,
  updateInquiryStatus,
} from "../services/inquiry-router-service";
import {
  createRealtorWaitlistEntry,
  getRealtorWaitlistEntries,
} from "../services/realtor-service";

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

router.post("/api/properties", async (req, res) => {
  await createProperty(req, res);
});

router.get("/api/properties", async (req, res) => {
  await getProperties(req, res);
});

router.get("/api/properties/:id", async (req, res) => {
  await getPropertyById(req, res);
});

router.patch("/api/properties/:id/status", async (req, res) => {
  await updatePropertyStatus(req, res);
});

router.patch("/api/properties/:id", async (req, res) => {
  await updateProperty(req, res);
});

router.get("/api/properties/export/csv", async (req, res) => {
  await exportInquiriesToCSV(req, res);
});

router.get("/api/agents", async (req, res) => {
  await getAgents(req, res);
});

router.post("/api/agents", async (req, res) => {
  await createAgent(req, res);
});

router.get("/api/agents/:id", async (req, res) => {
  await getAgentById(req, res);
});

router.post("/api/inquiries", async (req, res) => {
  await createInquiry(req, res);
});

router.get("/api/inquiries", async (req, res) => {
  await getInquiries(req, res);
});

router.patch("/api/inquiries/:id/status", async (req, res) => {
  await updateInquiryStatus(req, res);
});

router.get("/api/realtor-waitlist", async (req, res) => {
  await getRealtorWaitlistEntries(req, res);
});

router.post("/api/realtor-waitlist", async (req, res) => {
  await createRealtorWaitlistEntry(req, res);
});

export default router;
