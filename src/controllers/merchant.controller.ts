import { Request, Response, NextFunction } from "express";
import { successResponse } from "../utils/response";
import * as merchantService from "../services/merchant.service";
import prisma from "../config/database";

// ─── Categories ───────────────────────────────────────────────────────────────

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const tab = req.query.category as string | undefined;
    const result = await merchantService.getCategories(merchantId, tab);
    successResponse(res, "Categories fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.createCategory(merchantId, req.body);
    successResponse(res, "Category created successfully.", result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.updateCategory(req.params.id as string, merchantId, req.body);
    successResponse(res, "Category updated successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.deleteCategory(req.params.id as string, merchantId);
    successResponse(res, "Category deleted successfully.", result);
  } catch (error) {
    next(error);
  }
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const tab = req.query.category as string | undefined;
    const result = await merchantService.getProducts(merchantId, tab);
    successResponse(res, "Products fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.createProduct(merchantId, req.body);
    successResponse(res, "Product created successfully.", result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.updateProduct(req.params.id as string, merchantId, req.body);
    successResponse(res, "Product updated successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.deleteProduct(req.params.id as string, merchantId);
    successResponse(res, "Product deleted successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const { ids } = req.body;
    const result = await merchantService.bulkDeleteProducts(ids, merchantId);
    successResponse(res, "Products deleted successfully.", result);
  } catch (error) {
    next(error);
  }
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const tab = req.query.category as string | undefined;
    const result = await merchantService.getOrders(merchantId, tab);
    successResponse(res, "Orders fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.createOrder(merchantId, req.body);
    successResponse(res, "Order created successfully.", result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const { status } = req.body;
    const result = await merchantService.updateOrderStatus(req.params.id as string, merchantId, status);
    successResponse(res, "Order status updated successfully.", result);
  } catch (error) {
    next(error);
  }
};

// ─── Customers ────────────────────────────────────────────────────────────────

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.getCustomers(merchantId);
    successResponse(res, "Customers fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

// ─── Coupons ──────────────────────────────────────────────────────────────────

export const getCoupons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.getCoupons(merchantId);
    successResponse(res, "Coupons fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.createCoupon(merchantId, req.body);
    successResponse(res, "Coupon created successfully.", result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.updateCoupon(req.params.id as string, merchantId, req.body);
    successResponse(res, "Coupon updated successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.deleteCoupon(req.params.id as string, merchantId);
    successResponse(res, "Coupon deleted successfully.", result);
  } catch (error) {
    next(error);
  }
};

// ─── Staff ────────────────────────────────────────────────────────────────────

export const getStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.getStaff(merchantId);
    successResponse(res, "Staff records fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const createStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.createStaff(merchantId, req.body);
    successResponse(res, "Staff member added successfully.", result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.updateStaff(req.params.id as string, merchantId, req.body);
    successResponse(res, "Staff record updated successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const deleteStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.deleteStaff(req.params.id as string, merchantId);
    successResponse(res, "Staff member deleted successfully.", result);
  } catch (error) {
    next(error);
  }
};

// ─── Printers ──────────────────────────────────────────────────────────────────

export const getPrinters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.getPrinters(merchantId);
    successResponse(res, "Printer devices fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const createPrinter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.createPrinter(merchantId, req.body);
    successResponse(res, "Printer configured successfully.", result, 201);
  } catch (error) {
    next(error);
  }
};

export const deletePrinter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.deletePrinter(req.params.id as string, merchantId);
    successResponse(res, "Printer deleted successfully.", result);
  } catch (error) {
    next(error);
  }
};

// ─── Support Tickets ───────────────────────────────────────────────────────────

export const getTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.getTickets(merchantId);
    successResponse(res, "Support tickets fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.createTicket(merchantId, req.body);
    successResponse(res, "Support ticket created successfully.", result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateTicketStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const { status } = req.body;
    const result = await merchantService.updateTicketStatus(req.params.id as string, merchantId, status);
    successResponse(res, "Ticket status updated successfully.", result);
  } catch (error) {
    next(error);
  }
};

// ─── Delivery Zones ───────────────────────────────────────────────────────────

export const getDeliveryZones = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.getDeliveryZones(merchantId);
    successResponse(res, "Delivery zones fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const createDeliveryZone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const result = await merchantService.createDeliveryZone(merchantId, req.body);
    successResponse(res, "Delivery zone added successfully.", result, 201);
  } catch (error) {
    next(error);
  }
};

// ─── Dashboard Analytics ───────────────────────────────────────────────────────

export const getDashboardAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const tab = req.query.category as string | undefined;
    const result = await merchantService.getDashboardAnalytics(merchantId, tab);
    successResponse(res, "Dashboard analytics fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

// ─── WhatsApp / Meta embedded signup callback ───────────────────────────────

export const saveWhatsAppConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;
    const { businessId, wabaId, phoneNumberId, accessToken } = req.body;

    const result = await prisma.whatsAppAccount.upsert({
      where: { merchantId },
      create: {
        merchantId,
        businessId,
        wabaId,
        phoneNumberId,
        accessToken,
        connectionStatus: "Connected",
      },
      update: {
        businessId,
        wabaId,
        phoneNumberId,
        accessToken,
        connectionStatus: "Connected",
      },
    });

    successResponse(res, "WhatsApp business profile configured successfully.", result);
  } catch (error) {
    next(error);
  }
};

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export const verifyWebhook = async (req: Request, res: Response) => {
  const verifyToken = process.env.META_VERIFY_TOKEN || "offshift_verify_token";
  
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      console.log("✅ Webhook verified successfully");
      res.status(200).send(challenge);
      return;
    }
  }
  res.status(403).send("Verification failed");
};

export const receiveWebhookPayload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("📥 Received incoming WhatsApp Webhook:", JSON.stringify(req.body));
    
    // Save webhook events to the database (messages log, status details, updates)
    // We log it and send HTTP 200 to acknowledge receipt to Meta.
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
