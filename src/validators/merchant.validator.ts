import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Name is required").trim(),
  slug: z.string().optional(),
  category: z.string().min(2, "Category tab name is required").trim(),
});

export const productVariantSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().optional().default(0),
  sku: z.string().optional(),
});

export const productAddonSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().min(0),
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").trim(),
  price: z.coerce.number().min(0, "Price must be positive"),
  secondary: z.string().optional(),
  status: z.enum(["Available", "Out of Stock", "Active", "Draft"]).default("Available"),
  stock: z.coerce.number().optional().default(0),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  image: z.string().optional(),
  categoryId: z.string().optional(),
  variants: z.array(productVariantSchema).optional(),
  addons: z.array(productAddonSchema).optional(),
});

export const orderItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string(),
  price: z.coerce.number(),
  qty: z.coerce.number().int().positive(),
});

export const orderSchema = z.object({
  customerName: z.string().min(2, "Customer name is required").trim(),
  customerPhone: z.string().min(6, "Customer phone is required").trim(),
  total: z.coerce.number().min(0),
  status: z.string().default("New"),
  paymentStatus: z.string().default("Pending"),
  paymentMode: z.string().default("COD"),
  notes: z.string().optional(),
  category: z.string().trim(),
  items: z.array(orderItemSchema).min(1, "Order must have at least 1 item"),
});

export const couponSchema = z.object({
  code: z.string().min(2).toUpperCase().trim(),
  discount: z.string().min(1),
  expiry: z.union([z.string(), z.date()]).optional().transform((v) => (v ? new Date(v) : new Date(Date.now() + 30 * 86400000))),
  usageLimit: z.coerce.number().optional().default(100),
  minOrder: z.coerce.number().optional().default(0),
  status: z.enum(["Active", "Expired"]).default("Active"),
});

export const staffSchema = z.object({
  name: z.string().min(2).trim(),
  role: z.string().min(2).trim(),
  email: z.union([z.string().email(), z.literal(""), z.undefined()]).optional().transform((v) => (v && v.trim().length > 0 ? v : undefined)),
  phone: z.union([z.string(), z.literal(""), z.undefined()]).optional().transform((v) => (v && v.trim().length > 0 ? v : undefined)),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});

export const printerSchema = z.object({
  name: z.string().min(2).trim(),
  type: z.enum(["Receipt", "Kitchen"]).default("Receipt"),
  ipAddress: z.string().trim(),
  paperWidth: z.enum(["80mm", "58mm"]).default("80mm"),
  status: z.enum(["Online", "Offline"]).default("Online"),
});

export const ticketSchema = z.object({
  device: z.string().optional(),
  client: z.string().optional(),
  issue: z.string().min(2).trim(),
  category: z.enum(["WhatsApp API", "Hardware", "Billing", "Software Bug", "Other"]).default("WhatsApp API"),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  status: z.enum(["Pending", "In Progress", "Completed"]).default("Pending"),
});

export const deliveryZoneSchema = z.object({
  name: z.string().min(2).trim(),
  charges: z.coerce.number().min(0),
  minAmount: z.coerce.number().min(0),
});

export const branchSchema = z.object({
  name: z.string().min(2).trim(),
  address: z.string().min(2).trim(),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const comboSchema = z.object({
  name: z.string().min(2).trim(),
  price: z.coerce.number().min(0),
  description: z.string().optional(),
});

export const campaignSchema = z.object({
  name: z.string().min(2).trim(),
  template: z.string().min(2).trim(),
  sent: z.coerce.number().optional().default(0),
  readRate: z.coerce.number().optional().default(0),
  date: z.string().optional(),
});

export const reviewSchema = z.object({
  customer: z.string().min(2).trim(),
  rating: z.coerce.number().min(1).max(5).default(5),
  comment: z.string().min(2).trim(),
});
