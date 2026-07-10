const { getDatabase } = require("firebase-admin/database");
const { initializeApp } = require("firebase-admin/app");
const { logger } = require("firebase-functions");
const { onValueCreated } = require("firebase-functions/v2/database");
const webPush = require("web-push");

initializeApp();

const CHANNEL_LABELS = {
  whatsapp: "WhatsApp",
  viber: "Viber",
  sms: "SMS/iMessage"
};

exports.sendRequestWebPush = onValueCreated("users/{uid}/messageRequests/{requestId}", async (event) => {
  const request = event.data.val();
  const { uid, requestId } = event.params;

  if (!request || request.status !== "pending" || !request.targetDeviceId) {
    return;
  }

  const vapid = getVapidConfig();
  if (!vapid) {
    logger.warn("Web Push skipped because VAPID environment variables are not configured.");
    return;
  }

  const database = getDatabase();
  const deviceRef = database.ref(`users/${uid}/devices/${request.targetDeviceId}`);
  const deviceSnapshot = await deviceRef.get();
  const device = deviceSnapshot.val();
  const subscription = device?.pushSubscription;

  if (!device || device.notificationPermission !== "granted" || !isValidSubscription(subscription)) {
    logger.info("Web Push skipped because target device is not subscribed.", {
      requestId,
      targetDeviceId: request.targetDeviceId
    });
    return;
  }

  webPush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const links = buildLinks(request, device);
  const channelLabel = CHANNEL_LABELS[request.channel] || "Message";
  const payload = {
    title: `${channelLabel} message request`,
    body: `${channelLabel} / ${request.recipient || "recipient"}`,
    appUrl: `/?view=pending&request=${encodeURIComponent(requestId)}&handoff=1`,
    handoffUrl: links[request.channel] || "",
    requestId,
    channel: request.channel || "",
    tag: `n-smart-request-${requestId}`
  };

  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
    await event.data.ref.child("notificationDelivery").child(request.targetDeviceId).set({
      mode: "web-push",
      status: "sent",
      sentAt: new Date().toISOString()
    });
  } catch (error) {
    logger.warn("Web Push send failed.", {
      requestId,
      targetDeviceId: request.targetDeviceId,
      statusCode: error.statusCode || null,
      message: error.message || "unknown"
    });

    if ([404, 410].includes(Number(error.statusCode))) {
      await deviceRef.child("pushSubscription").remove();
      await deviceRef.update({
        notificationMode: "local",
        pushSubscriptionUpdatedAt: ""
      });
    }

    await event.data.ref.child("notificationDelivery").child(request.targetDeviceId).set({
      mode: "web-push",
      status: "failed",
      statusCode: error.statusCode || null,
      failedAt: new Date().toISOString()
    });
  }
});

function getVapidConfig() {
  const publicKey = process.env.N_RELAY_WEB_PUSH_PUBLIC_KEY || "";
  const privateKey = process.env.N_RELAY_WEB_PUSH_PRIVATE_KEY || "";
  const subject = process.env.N_RELAY_WEB_PUSH_SUBJECT || "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

function isValidSubscription(subscription) {
  return Boolean(
    subscription?.endpoint
      && subscription?.keys?.p256dh
      && subscription?.keys?.auth
  );
}

function buildLinks(request, device) {
  const message = encodeURIComponent(request.message || "");
  const recipient = request.recipient || "";
  const phoneForWhatsapp = recipient.replace(/[^\d]/g, "");
  const phoneForSms = recipient.replace(/[^\d+.-]/g, "");
  const smsBodySeparator = phoneForSms && device.platform === "ios" ? "&" : "?";

  return {
    whatsapp: phoneForWhatsapp ? `https://wa.me/${phoneForWhatsapp}?text=${message}` : `https://wa.me/?text=${message}`,
    viber: `viber://forward?text=${message}`,
    sms: `sms:${phoneForSms}${message ? `${smsBodySeparator}body=${message}` : ""}`
  };
}
