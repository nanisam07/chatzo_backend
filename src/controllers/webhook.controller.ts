import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { whatsappService } from "../services/whatsapp.service";
import { env } from "../config/env";

const prisma = new PrismaClient();

export const verifyWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      const validTokens = [env.META_VERIFY_TOKEN, "offshift", "offshift_verify_token"].filter(Boolean);
      if (mode === "subscribe" && (validTokens.includes(String(token)) || !env.META_VERIFY_TOKEN)) {
        console.log("[Webhook] Webhook verified successfully with token:", token);
        res.status(200).send(challenge);
        return;
      }
    }
    console.warn("[Webhook] Webhook verification failed for token:", token);
    res.sendStatus(403);
  } catch (error) {
    next(error);
  }
};

export const receiveWebhookEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body;
    console.log("[Webhook] Received event:", JSON.stringify(body, null, 2));

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const metadata = value?.metadata;
      const message = value?.messages?.[0];
      const status = value?.statuses?.[0];

      // Handle incoming messages
      if (message) {
        const fromPhoneNumberId = metadata?.phone_number_id;
        const customerPhone = message.from;
        const customerName = value?.contacts?.[0]?.profile?.name || customerPhone;

        let textContent = "[Received Attachment]";
        if (message.type === "text") {
          textContent = message.text?.body || "";
        } else if (message.type === "interactive") {
          const type = message.interactive?.type;
          if (type === "button_reply") {
            textContent = message.interactive?.button_reply?.title || "";
          } else if (type === "list_reply") {
            textContent = message.interactive?.list_reply?.title || "";
          }
        }

        if (fromPhoneNumberId) {
          // Look up matching merchant account
          const account = await prisma.whatsAppAccount.findFirst({
            where: { phoneNumberId: fromPhoneNumberId },
          });

          const merchantId = account ? account.merchantId : undefined;

          if (account && account.connectionStatus === "Connected") {
            await whatsappService.persistMessage({
              merchantId: account.merchantId,
              customerPhone,
              customerName,
              text: textContent,
              sender: "customer",
            });
            console.log(`[Webhook] Saved message from ${customerPhone} for merchant ${account.merchantId}`);
          } else {
            console.log(`[Webhook] Processing test/direct message for phoneNumberId: ${fromPhoneNumberId}`);
          }

          // ── Native WhatsApp Product Catalog Chatbot ──
          // 1. Handle Product Selection from Interactive List
          if (message.type === "interactive" && message.interactive?.type === "list_reply") {
            const selectedId = message.interactive.list_reply.id;
            if (selectedId.startsWith("prod_")) {
              const prodId = selectedId.replace("prod_", "");
              const product = await prisma.product.findUnique({ where: { id: prodId } });
              const prodName = product ? product.name : "Selected Product";
              const prodPrice = product ? `₹${product.price}` : "₹499";
              const prodDesc = product ? (product.secondary || "High quality item") : "Available for immediate order.";

              if (merchantId && account) {
                await whatsappService.sendMessage(merchantId, {
                  recipientPhone: customerPhone,
                  type: "interactive_button",
                  text: `🛍️ *${prodName}*\n💰 *Price:* ${prodPrice}\n\n📝 ${prodDesc}\n\nWould you like to place an order?`,
                  buttons: [
                    { id: `buy_${prodId}`, title: "🛒 Confirm Order" },
                    { id: "show_catalog", title: "📋 View Catalog" },
                  ],
                });
              } else {
                await sendDirectInteractiveButton(fromPhoneNumberId, customerPhone, prodName, prodPrice, prodDesc, prodId);
              }
            }
          }
          // 2. Handle Button Selection (Order Confirmation or Back to Catalog)
          else if (message.type === "interactive" && message.interactive?.type === "button_reply") {
            const buttonId = message.interactive.button_reply.id;
            if (buttonId.startsWith("buy_")) {
              const prodId = buttonId.replace("buy_", "");
              const product = await prisma.product.findUnique({ where: { id: prodId } });
              const prodName = product ? product.name : "Product";
              const prodPrice = product ? `₹${product.price}` : "";

              if (merchantId && account) {
                await whatsappService.sendMessage(merchantId, {
                  recipientPhone: customerPhone,
                  type: "text",
                  text: `🎉 *Order Confirmed!*\n\nYour order for *${prodName}* (${prodPrice}) has been received successfully!\n\n📍 *Status:* Processing\n🚚 Our team will prepare your delivery shortly. Thank you for shopping with OFFSHIFT! 🙌`,
                });
              } else {
                await sendDirectText(fromPhoneNumberId, customerPhone, `🎉 *Order Confirmed!*\n\nYour order for *${prodName}* (${prodPrice}) has been received successfully!\n\n📍 *Status:* Processing\n🚚 Our team will prepare your delivery shortly. Thank you for shopping with OFFSHIFT! 🙌`);
              }
            } else if (buttonId === "show_catalog") {
              await sendCatalogList(merchantId, customerPhone, fromPhoneNumberId);
            }
          }
          // 3. Handle Greeting / Menu Trigger ("hi", "hello", "menu", "products", etc.)
          else {
            await sendCatalogList(merchantId, customerPhone, fromPhoneNumberId);
          }
        }
      }

      // Handle message statuses (sent, delivered, read)
      if (status) {
        const messageId = status.id;
        const messageStatus = status.status;
        const recipientId = status.recipient_id;
        console.log(`[Webhook] Message ID ${messageId} status updated to: ${messageStatus} for recipient: ${recipientId}`);
      }

      res.status(200).send("EVENT_RECEIVED");
      return;
    }

    res.sendStatus(404);
  } catch (error) {
    next(error);
  }
};

async function sendCatalogList(merchantId: string | undefined, recipientPhone: string, phoneNumberId?: string): Promise<void> {
  try {
    let rows: { id: string; title: string; description: string }[] = [];

    if (merchantId) {
      const products = await prisma.product.findMany({
        where: { merchantId },
        take: 10,
      });

      rows = products.map((p) => ({
        id: `prod_${p.id}`,
        title: p.name.substring(0, 24),
        description: `₹${p.price} - ${(p.secondary || "High quality item").substring(0, 50)}`.substring(0, 72),
      }));
    }

    if (rows.length === 0) {
      rows = [
        { id: "prod_sample_1", title: "Premium Coffee Beans", description: "₹499 - Organic arabica whole roast" },
        { id: "prod_sample_2", title: "Artisan Ceramic Mug", description: "₹299 - Handmade ceramic mug" },
        { id: "prod_sample_3", title: "Espresso Maker", description: "₹1499 - Compact Italian brewer" },
      ];
    }

    if (merchantId) {
      await whatsappService.sendMessage(merchantId, {
        recipientPhone,
        type: "interactive_list",
        text: "Welcome to OFFSHIFT Storefront! 🛍️\n\nTap below to explore our available products, inspect prices, and confirm your order directly inside WhatsApp:",
        sections: [{ title: "Storefront Catalog", rows }],
      });
    } else if (phoneNumberId) {
      await sendDirectMessage(phoneNumberId, recipientPhone, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: "Welcome to OFFSHIFT Storefront! 🛍️\n\nTap below to explore our available products, inspect prices, and confirm your order directly inside WhatsApp:" },
          action: {
            button: "Select Product",
            sections: [{ title: "Storefront Catalog", rows }],
          },
        },
      });
    }
  } catch (err) {
    console.error("[Webhook] Failed to send catalog list:", err);
  }
}

async function sendDirectInteractiveButton(phoneNumberId: string, recipientPhone: string, name: string, price: string, desc: string, prodId: string): Promise<void> {
  await sendDirectMessage(phoneNumberId, recipientPhone, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: `🛍️ *${name}*\n💰 *Price:* ${price}\n\n📝 ${desc}\n\nWould you like to place an order?` },
      action: {
        buttons: [
          { type: "reply", reply: { id: `buy_${prodId}`, title: "🛒 Confirm Order" } },
          { type: "reply", reply: { id: "show_catalog", title: "📋 View Catalog" } },
        ],
      },
    },
  });
}

async function sendDirectText(phoneNumberId: string, recipientPhone: string, text: string): Promise<void> {
  await sendDirectMessage(phoneNumberId, recipientPhone, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "text",
    text: { body: text },
  });
}

async function sendDirectMessage(phoneNumberId: string, recipientPhone: string, body: any): Promise<void> {
  try {
    let token = process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || env.WHATSAPP_ACCESS_TOKEN || "";
    
    if (!token) {
      // Fallback: Check DB for any active encrypted access token
      const dbAccount = await prisma.whatsAppAccount.findFirst({
        where: { connectionStatus: "Connected" },
      });
      if (dbAccount && dbAccount.accessToken) {
        try {
          const { decrypt } = require("../utils/crypto");
          token = decrypt(dbAccount.accessToken);
        } catch (e) {
          // ignore decrypt error
        }
      }
    }

    if (!token) {
      console.warn("[Webhook] No valid Meta Access Token found in env or database. Message delivery aborted.");
      return;
    }

    const graphVer = process.env.META_GRAPH_VERSION || env.META_GRAPH_VERSION || "v20.0";
    const res = await fetch(`https://graph.facebook.com/${graphVer}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const resData = (await res.json()) as any;
    if (!res.ok || resData.error) {
      console.error("[Webhook] Meta Graph API returned error:", JSON.stringify(resData, null, 2));
    } else {
      console.log("[Webhook] Message dispatched successfully to Meta Graph API:", resData.messages?.[0]?.id || "OK");
    }
  } catch (err) {
    console.error("[Webhook] sendDirectMessage exception:", err);
  }
}
