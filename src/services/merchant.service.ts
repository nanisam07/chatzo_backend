import prisma from "../config/database";

// ─── Categories ───────────────────────────────────────────────────────────────

export const getCategories = async (merchantId: string, categoryTab?: string) => {
  return prisma.category.findMany({
    where: {
      merchantId,
      ...(categoryTab ? { category: categoryTab } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
};

export const createCategory = async (
  merchantId: string,
  data: { name: string; slug: string; category: string }
) => {
  return prisma.category.create({
    data: {
      ...data,
      merchantId,
    },
  });
};

export const updateCategory = async (
  id: string,
  merchantId: string,
  data: { name?: string; slug?: string; category?: string }
) => {
  return prisma.category.update({
    where: { id, merchantId },
    data,
  });
};

export const deleteCategory = async (id: string, merchantId: string) => {
  await prisma.category.delete({
    where: { id, merchantId },
  });
  return { success: true };
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const getProducts = async (merchantId: string, categoryTab?: string) => {
  return prisma.product.findMany({
    where: {
      merchantId,
      ...(categoryTab
        ? {
            categoryRelation: {
              category: categoryTab,
            },
          }
        : {}),
    },
    include: {
      categoryRelation: true,
      variants: true,
      addons: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const createProduct = async (
  merchantId: string,
  data: {
    name: string;
    price: number;
    secondary?: string;
    status: string;
    stock?: number;
    sku?: string;
    barcode?: string;
    image?: string;
    categoryId?: string;
  }
) => {
  return prisma.product.create({
    data: {
      name: data.name,
      price: data.price,
      secondary: data.secondary,
      status: data.status,
      stock: data.stock,
      sku: data.sku,
      barcode: data.barcode,
      image: data.image,
      categoryId: data.categoryId,
      merchantId,
    },
  });
};

export const updateProduct = async (
  id: string,
  merchantId: string,
  data: {
    name?: string;
    price?: number;
    secondary?: string;
    status?: string;
    stock?: number;
    sku?: string;
    barcode?: string;
    image?: string;
    categoryId?: string;
  }
) => {
  return prisma.product.update({
    where: { id, merchantId },
    data,
  });
};

export const deleteProduct = async (id: string, merchantId: string) => {
  await prisma.product.delete({
    where: { id, merchantId },
  });
  return { success: true };
};

export const bulkDeleteProducts = async (ids: string[], merchantId: string) => {
  await prisma.product.deleteMany({
    where: {
      id: { in: ids },
      merchantId,
    },
  });
  return { success: true };
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const getOrders = async (merchantId: string, categoryTab?: string) => {
  return prisma.order.findMany({
    where: {
      merchantId,
      ...(categoryTab ? { category: categoryTab } : {}),
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
};

export const createOrder = async (
  merchantId: string,
  data: {
    customerName: string;
    customerPhone: string;
    total: number;
    status: string;
    paymentStatus?: string;
    paymentMode?: string;
    notes?: string;
    category: string;
    items: { productId?: string; name: string; price: number; qty: number }[];
  }
) => {
  // Upsert Customer CRM profile
  await prisma.customer.upsert({
    where: { phone: data.customerPhone },
    create: {
      name: data.customerName,
      phone: data.customerPhone,
      ordersCount: 1,
      totalSpend: data.total,
      merchantId,
    },
    update: {
      name: data.customerName,
      ordersCount: { increment: 1 },
      totalSpend: { increment: data.total },
      lastActive: new Date(),
    },
  });

  return prisma.order.create({
    data: {
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      total: data.total,
      status: data.status,
      paymentStatus: data.paymentStatus,
      paymentMode: data.paymentMode,
      notes: data.notes,
      category: data.category,
      merchantId,
      items: {
        create: data.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          qty: i.qty,
        })),
      },
    },
    include: { items: true },
  });
};

export const updateOrderStatus = async (
  id: string,
  merchantId: string,
  status: string
) => {
  return prisma.order.update({
    where: { id, merchantId },
    data: { status },
  });
};

// ─── Customers ────────────────────────────────────────────────────────────────

export const getCustomers = async (merchantId: string) => {
  return prisma.customer.findMany({
    where: { merchantId },
    orderBy: { lastActive: "desc" },
  });
};

// ─── Coupons ──────────────────────────────────────────────────────────────────

export const getCoupons = async (merchantId: string) => {
  return prisma.coupon.findMany({
    where: { merchantId },
    orderBy: { id: "desc" },
  });
};

export const createCoupon = async (
  merchantId: string,
  data: { code: string; discount: string; expiry: Date; usageLimit?: number; minOrder?: number; status: string }
) => {
  return prisma.coupon.create({
    data: {
      ...data,
      merchantId,
    },
  });
};

export const updateCoupon = async (
  id: string,
  merchantId: string,
  data: { code?: string; discount?: string; expiry?: Date; usageLimit?: number; minOrder?: number; status?: string }
) => {
  return prisma.coupon.update({
    where: { id, merchantId },
    data,
  });
};

export const deleteCoupon = async (id: string, merchantId: string) => {
  await prisma.coupon.delete({
    where: { id, merchantId },
  });
  return { success: true };
};

// ─── Staff ────────────────────────────────────────────────────────────────────

export const getStaff = async (merchantId: string) => {
  return prisma.staff.findMany({
    where: { merchantId },
    orderBy: { name: "asc" },
  });
};

export const createStaff = async (
  merchantId: string,
  data: { name: string; role: string; email?: string; phone?: string; status: string }
) => {
  return prisma.staff.create({
    data: {
      ...data,
      merchantId,
    },
  });
};

export const updateStaff = async (
  id: string,
  merchantId: string,
  data: { name?: string; role?: string; email?: string; phone?: string; status?: string }
) => {
  return prisma.staff.update({
    where: { id, merchantId },
    data,
  });
};

export const deleteStaff = async (id: string, merchantId: string) => {
  await prisma.staff.delete({
    where: { id, merchantId },
  });
  return { success: true };
};

// ─── Printers ──────────────────────────────────────────────────────────────────

export const getPrinters = async (merchantId: string) => {
  return prisma.printerDevice.findMany({
    where: { merchantId },
  });
};

export const createPrinter = async (
  merchantId: string,
  data: { name: string; type: string; ipAddress: string; paperWidth: string; status: string }
) => {
  return prisma.printerDevice.create({
    data: {
      ...data,
      merchantId,
    },
  });
};

export const deletePrinter = async (id: string, merchantId: string) => {
  await prisma.printerDevice.delete({
    where: { id, merchantId },
  });
  return { success: true };
};

// ─── Support Tickets ───────────────────────────────────────────────────────────

export const getTickets = async (merchantId: string) => {
  return prisma.supportTicket.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
  });
};

export const createTicket = async (
  merchantId: string,
  data: { device?: string; client?: string; issue: string; category: string; priority: string; status: string }
) => {
  return prisma.supportTicket.create({
    data: {
      ...data,
      merchantId,
    },
  });
};

export const updateTicketStatus = async (id: string, merchantId: string, status: string) => {
  return prisma.supportTicket.update({
    where: { id, merchantId },
    data: { status },
  });
};

// ─── Delivery Zones ───────────────────────────────────────────────────────────

export const getDeliveryZones = async (merchantId: string) => {
  return prisma.deliveryZone.findMany({
    where: { merchantId },
  });
};

export const createDeliveryZone = async (
  merchantId: string,
  data: { name: string; charges: number; minAmount: number }
) => {
  return prisma.deliveryZone.create({
    data: {
      ...data,
      merchantId,
    },
  });
};

// ─── Dashboard Analytics ───────────────────────────────────────────────────────

export const getDashboardAnalytics = async (merchantId: string, categoryTab = "retail") => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Today's orders count
  const todayOrdersCount = await prisma.order.count({
    where: {
      merchantId,
      category: categoryTab,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
  });

  // 2. Today's revenue
  const todayOrders = await prisma.order.findMany({
    where: {
      merchantId,
      category: categoryTab,
      status: { not: "Cancelled" },
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    select: { total: true },
  });
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);

  // 3. Active orders (Preparing, Accepted, New, Ready)
  const activeOrdersCount = await prisma.order.count({
    where: {
      merchantId,
      category: categoryTab,
      status: { in: ["New", "Accepted", "Preparing", "Ready"] },
    },
  });

  // 4. Pending dues (total revenue not settled or Cash on Delivery pending)
  const pendingDuesOrders = await prisma.order.findMany({
    where: {
      merchantId,
      category: categoryTab,
      paymentStatus: "Pending",
    },
    select: { total: true },
  });
  const pendingDues = pendingDuesOrders.reduce((sum, o) => sum + o.total, 0);

  // 5. Order list
  const recentOrders = await prisma.order.findMany({
    where: { merchantId, category: categoryTab },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // 6. Top Selling Products
  const orderItems = await prisma.orderItem.groupBy({
    by: ["name"],
    where: {
      order: {
        merchantId,
        category: categoryTab,
      },
    },
    _sum: {
      qty: true,
    },
    orderBy: {
      _sum: {
        qty: "desc",
      },
    },
    take: 5,
  });

  const topSelling = orderItems.map((item) => ({
    name: item.name,
    qty: item._sum.qty || 0,
  }));

  // 7. Graph statistics (Hourly distribution of today's sales)
  const salesDistribution = Array(7).fill(0);
  const hourRanges = [9, 11, 13, 15, 17, 19, 21];

  for (let i = 0; i < hourRanges.length; i++) {
    const hr = hourRanges[i];
    const from = new Date(startOfDay);
    from.setHours(hr - 2);
    const to = new Date(startOfDay);
    to.setHours(hr);

    const rangeOrders = await prisma.order.findMany({
      where: {
        merchantId,
        category: categoryTab,
        createdAt: { gte: from, lte: to },
        status: { not: "Cancelled" },
      },
      select: { total: true },
    });
    salesDistribution[i] = rangeOrders.reduce((sum, o) => sum + o.total, 0);
  }

  return {
    todayOrdersCount,
    todayRevenue,
    activeOrdersCount,
    pendingDues,
    recentOrders,
    topSelling,
    salesDistribution,
  };
};
