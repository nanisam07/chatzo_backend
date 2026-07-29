import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import * as merchantController from "../controllers/merchant.controller";
import {
  categorySchema,
  productSchema,
  orderSchema,
  couponSchema,
  staffSchema,
  printerSchema,
  ticketSchema,
  deliveryZoneSchema,
} from "../validators/merchant.validator";

const router = Router();

// ─── Webhook (public endpoints) ──────────────────────────────────────────────
router.get("/whatsapp/webhooks", merchantController.verifyWebhook);
router.post("/whatsapp/webhooks", merchantController.receiveWebhookPayload);

// All other endpoints require authentication
router.use(authenticate);

// ─── Categories ───────────────────────────────────────────────────────────────
router.get("/categories", merchantController.getCategories);
router.post("/categories", validate(categorySchema), merchantController.createCategory);
router.put("/categories/:id", validate(categorySchema.partial()), merchantController.updateCategory);
router.delete("/categories/:id", merchantController.deleteCategory);

// ─── Products ─────────────────────────────────────────────────────────────────
router.get("/products", merchantController.getProducts);
router.post("/products", validate(productSchema), merchantController.createProduct);
router.put("/products/:id", validate(productSchema.partial()), merchantController.updateProduct);
router.delete("/products/:id", merchantController.deleteProduct);
router.post("/products/bulk-delete", merchantController.bulkDeleteProducts);

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get("/orders", merchantController.getOrders);
router.post("/orders", validate(orderSchema), merchantController.createOrder);
router.patch("/orders/:id/status", merchantController.updateOrderStatus);

// ─── Customers ────────────────────────────────────────────────────────────────
router.get("/customers", merchantController.getCustomers);

// ─── Coupons ──────────────────────────────────────────────────────────────────
router.get("/coupons", merchantController.getCoupons);
router.post("/coupons", validate(couponSchema), merchantController.createCoupon);
router.put("/coupons/:id", validate(couponSchema.partial()), merchantController.updateCoupon);
router.delete("/coupons/:id", merchantController.deleteCoupon);

// ─── Staff ────────────────────────────────────────────────────────────────────
router.get("/staff", merchantController.getStaff);
router.post("/staff", validate(staffSchema), merchantController.createStaff);
router.put("/staff/:id", validate(staffSchema.partial()), merchantController.updateStaff);
router.delete("/staff/:id", merchantController.deleteStaff);

// ─── Printers ──────────────────────────────────────────────────────────────────
router.get("/printers", merchantController.getPrinters);
router.post("/printers", validate(printerSchema), merchantController.createPrinter);
router.delete("/printers/:id", merchantController.deletePrinter);

// ─── Support Tickets ───────────────────────────────────────────────────────────
router.get("/tickets", merchantController.getTickets);
router.post("/tickets", validate(ticketSchema), merchantController.createTicket);
router.patch("/tickets/:id/status", merchantController.updateTicketStatus);

// ─── Delivery Zones ───────────────────────────────────────────────────────────
router.get("/delivery-zones", merchantController.getDeliveryZones);
router.post("/delivery-zones", validate(deliveryZoneSchema), merchantController.createDeliveryZone);

// ─── Dashboard Analytics ───────────────────────────────────────────────────────
router.get("/analytics/dashboard", merchantController.getDashboardAnalytics);

// ─── WhatsApp Embedded Signup ────────────────────────────────────────────────
router.post("/whatsapp/embedded-signup", merchantController.saveWhatsAppConfig);

export default router;
