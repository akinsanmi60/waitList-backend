import { insertAgentSchema } from "../shared/supplierSchema";
import { storage } from "../supplierStorage";
import { Request, Response } from "express";
export const getAgents = async (req: Request, res: Response) => {
  try {
    const agents = await storage.getAgents();
    return res.status(200).json(agents);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve agents" });
  }
};

export const getAgentById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid agent ID" });
    }

    const agent = await storage.getAgentById(id);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    return res.status(200).json(agent);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve agent" });
  }
};

export const createAgent = async (req: Request, res: Response) => {
  try {
    const agentData = insertAgentSchema.parse(req.body);

    // Check if agent with this email already exists
    const existingAgent = await storage.getAgentByEmail(agentData.email);
    if (existingAgent) {
      return res
        .status(409)
        .json({ message: "An agent with this email already exists" });
    }

    const agent = await storage.createAgent(agentData);

    return res.status(201).json(agent);
  } catch (error) {
    return res.status(400).json({ message: "Invalid agent data", error });
  }
};
