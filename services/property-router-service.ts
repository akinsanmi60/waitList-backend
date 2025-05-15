import { insertPropertySchema } from "../shared/supplierSchema";
import { storage } from "../supplierStorage";
import { Request, Response } from "express";

export const getProperties = async (req: Request, res: Response) => {
  try {
    const properties = await storage.getProperties();
    return res.status(200).json(properties);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve properties" });
  }
};

export const getPropertyById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid property ID" });
    }

    const property = await storage.getPropertyById(id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    return res.status(200).json(property);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve property" });
  }
};

export const createProperty = async (req: Request, res: Response) => {
  try {
    const propertyData = insertPropertySchema.parse(req.body);
    const property = await storage.createProperty(propertyData);
    return res.status(201).json(property);
  } catch (error) {
    return res.status(400).json({ message: "Invalid property data", error });
  }
};

export const updateProperty = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid property ID" });
    }

    const updatedProperty = await storage.updateProperty(id, req.body);
    if (!updatedProperty) {
      return res.status(404).json({ message: "Property not found" });
    }

    return res.status(200).json(updatedProperty);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update property" });
  }
};

export const updatePropertyStatus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid property ID" });
    }

    const { status } = req.body;
    if (!status || !["active", "pending", "sold", "rented"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedProperty = await storage.updatePropertyStatus(id, status);
    if (!updatedProperty) {
      return res.status(404).json({ message: "Property not found" });
    }

    return res.status(200).json(updatedProperty);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update property status" });
  }
};
