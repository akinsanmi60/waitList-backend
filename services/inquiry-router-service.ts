import { Request, Response } from "express";
import { storage } from "../supplierStorage";
import { insertInquirySchema } from "../shared/supplierSchema";

export const createInquiry = async (req: Request, res: Response) => {
  try {
    const inquiryData = insertInquirySchema.parse(req.body);
    console.log(inquiryData);
    const inquiry = await storage.createInquiry(inquiryData);

    return res.status(201).json(inquiry);
  } catch (error) {
    return res.status(400).json({ message: "Invalid inquiry data", error });
  }
};

export const getInquiries = async (req: Request, res: Response) => {
  try {
    const inquiries = await storage.getInquiries();
    return res.status(200).json(inquiries);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve inquiries" });
  }
};

export const updateInquiryStatus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid inquiry ID" });
    }

    const { status } = req.body;
    if (!status || !["new", "contacted", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedInquiry = await storage.updateInquiryStatus(id, status);
    if (!updatedInquiry) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    return res.status(200).json(updatedInquiry);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update inquiry status" });
  }
};

export const exportInquiriesToCSV = async (req: Request, res: Response) => {
  try {
    const properties = await storage.getProperties();

    // Generate CSV content
    const headers = [
      "ID",
      "Title",
      "Price",
      "Address",
      "City",
      "State",
      "Bedrooms",
      "Bathrooms",
      "Square Feet",
      "Property Type",
      "Listing Type",
      "Status",
      "Created At",
    ];

    let csvContent = headers.join(",") + "\n";

    properties.forEach((property) => {
      const row = [
        `"${property.id}"`,
        `"${property.title.replace(/"/g, '""')}"`,
        `"${property.price}"`,
        `"${property.address.replace(/"/g, '""')}"`,
        `"${property.city}"`,
        `"${property.state}"`,
        `"${property.bedrooms}"`,
        `"${property.bathrooms}"`,
        `"${property.squareFeet}"`,
        `"${property.propertyType}"`,
        `"${property.listingType}"`,
        `"${property.status}"`,
        `"${property.createdAt.toISOString()}"`,
      ];

      csvContent += row.join(",") + "\n";
    });

    // Set response headers
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=properties.csv");

    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ message: "Failed to export properties" });
  }
};
