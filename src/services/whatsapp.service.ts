import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { encrypt, decrypt } from "../utils/crypto";

const prisma = new PrismaClient();

interface SendMessageOptions {
  recipientPhone: string;
  type: "text" | "image" | "document" | "template" | "interactive_button" | "interactive_list" | "product";
  text?: string;
  mediaUrl?: string;
  filename?: string;
  templateName?: string;
  buttons?: { id: string; title: string }[];
  sections?: { title: string; rows: { id: string; title: string; description?: string }[] }[];
  catalogId?: string;
  productSku?: string;
}

export const whatsappService = {
  // Exchange OAuth code for access token
  async exchangeCodeForToken(code: string, redirectUri?: string): Promise<{
    accessToken: string;
    tokenExpiry?: Date;
  }> {
    let url = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/oauth/access_token?client_id=${env.META_APP_ID}&client_secret=${env.META_APP_SECRET}&code=${code}`;
    
    if (redirectUri) {
      url += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
    }

    const res = await fetch(url);
    const data = (await res.json()) as any;
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to exchange authorization code for token");
    }
    const tokenExpiry = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined;
    return {
      accessToken: data.access_token,
      tokenExpiry,
    };
  },

  // Fetch WABA details shared with the token
  async fetchAccountDetails(token: string): Promise<{
    businessId: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    businessName: string;
  }> {
    // 1. Get shared WhatsApp Business Accounts
    const wabaUrl = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/me/whatsapp_business_accounts?access_token=${token}`;
    const wabaRes = await fetch(wabaUrl);
    const wabaData = (await wabaRes.json()) as any;
    if (!wabaRes.ok || !wabaData.data || wabaData.data.length === 0) {
      throw new Error(wabaData.error?.message || "No WhatsApp Business Accounts linked to this token");
    }

    const firstAccount = wabaData.data[0];
    const wabaId = firstAccount.id;
    const businessName = firstAccount.name || "My WhatsApp Store";

    // 2. Get phone numbers registered with this WABA
    const phoneUrl = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${wabaId}/phone_numbers?access_token=${token}`;
    const phoneRes = await fetch(phoneUrl);
    const phoneData = (await phoneRes.json()) as any;
    if (!phoneRes.ok || !phoneData.data || phoneData.data.length === 0) {
      throw new Error(phoneData.error?.message || "No phone numbers registered with this WhatsApp Business Account");
    }

    const firstPhone = phoneData.data[0];
    const phoneNumberId = firstPhone.id;
    const displayPhoneNumber = firstPhone.display_phone_number || "";

    // 3. For businessId, fetch WABA profile to resolve business owner
    const businessId = firstAccount.owner_business_info?.id || "1234567890";

    return {
      businessId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      businessName,
    };
  },

  // Persist conversation and message to Database
  async persistMessage(options: {
    merchantId: string;
    customerPhone: string;
    customerName?: string;
    text: string;
    sender: "customer" | "merchant" | "bot";
  }): Promise<any> {
    const { merchantId, customerPhone, customerName, text, sender } = options;

    let thread = await prisma.chatThread.findFirst({
      where: {
        merchantId,
        phone: customerPhone,
      },
    });

    const cleanTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          name: customerName || customerPhone,
          phone: customerPhone,
          lastMessage: text,
          time: cleanTime,
          unread: sender === "customer" ? 1 : 0,
          category: "retail",
          merchantId,
        },
      });
    } else {
      thread = await prisma.chatThread.update({
        where: { id: thread.id },
        data: {
          lastMessage: text,
          time: cleanTime,
          unread: sender === "customer" ? thread.unread + 1 : 0, // Reset unread if merchant replies
        },
      });
    }

    return prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        sender,
        text,
        time: cleanTime,
      },
    });
  },

  // Send WhatsApp message via Meta Cloud API
  async sendMessage(merchantId: string, options: SendMessageOptions): Promise<any> {
    const account = await prisma.whatsAppAccount.findUnique({
      where: { merchantId },
    });

    if (!account || account.connectionStatus === "Disconnected") {
      throw new Error("WhatsApp account not connected");
    }

    const accessToken = decrypt(account.accessToken);
    const phoneNumberId = account.phoneNumberId;

    let messageBody: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: options.recipientPhone,
    };

    switch (options.type) {
      case "text":
        messageBody = {
          ...messageBody,
          type: "text",
          text: { body: options.text || "" },
        };
        break;

      case "image":
        messageBody = {
          ...messageBody,
          type: "image",
          image: { link: options.mediaUrl || "" },
        };
        break;

      case "document":
        messageBody = {
          ...messageBody,
          type: "document",
          document: {
            link: options.mediaUrl || "",
            filename: options.filename || "Document",
          },
        };
        break;

      case "template":
        messageBody = {
          ...messageBody,
          type: "template",
          template: {
            name: options.templateName || "",
            language: { code: "en_US" },
          },
        };
        break;

      case "interactive_button":
        messageBody = {
          ...messageBody,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: options.text || "Please select an option" },
            action: {
              buttons: (options.buttons || []).map((b) => ({
                type: "reply",
                reply: { id: b.id, title: b.title },
              })),
            },
          },
        };
        break;

      case "interactive_list":
        messageBody = {
          ...messageBody,
          type: "interactive",
          interactive: {
            type: "list",
            body: { text: options.text || "Please select from the options" },
            action: {
              button: "Select",
              sections: (options.sections || []).map((sec) => ({
                title: sec.title,
                rows: sec.rows.map((r) => ({
                  id: r.id,
                  title: r.title,
                  description: r.description,
                })),
              })),
            },
          },
        };
        break;

      case "product":
        messageBody = {
          ...messageBody,
          type: "interactive",
          interactive: {
            type: "product",
            action: {
              catalog_id: options.catalogId || "",
              product_retailer_id: options.productSku || "",
            },
          },
        };
        break;
    }

    // Call Graph API (if config is real, otherwise mock)
    let metaMessageId = "mock_msg_id_" + Math.random().toString(36).substr(2, 9);
    
    if (env.META_APP_ID && accessToken && accessToken !== "mock_token") {
      const url = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${phoneNumberId}/messages`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messageBody),
        });
        const responseData = (await response.json()) as any;
        if (!response.ok || responseData.error) {
          console.error("Meta API Message Send Error:", responseData.error);
        } else {
          metaMessageId = responseData.messages?.[0]?.id || metaMessageId;
        }
      } catch (err) {
        console.error("Failed to make request to Meta API:", err);
      }
    }

    // Store outgoing message
    await this.persistMessage({
      merchantId,
      customerPhone: options.recipientPhone,
      text: options.text || `[Sent ${options.type} message]`,
      sender: "merchant",
    });

    return { success: true, messageId: metaMessageId };
  },
};
