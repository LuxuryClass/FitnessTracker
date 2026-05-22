// Конвертирует VAPID public key из base64url в Uint8Array — формат, который ожидает PushManager.subscribe
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Кодирует ArrayBuffer (ключи подписки) в base64url для передачи на сервер
const arrayBufferToBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export interface SerializedPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const isPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return Notification.requestPermission();
};

const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration> => {
  const registration = await navigator.serviceWorker.ready;
  return registration;
};

export const serializeSubscription = (subscription: PushSubscription): SerializedPushSubscription => {
  const p256dhKey = subscription.getKey("p256dh");
  const authKey = subscription.getKey("auth");
  if (!p256dhKey || !authKey) {
    throw new Error("Push-подписка не содержит требуемых ключей.");
  }
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64Url(p256dhKey),
      auth: arrayBufferToBase64Url(authKey),
    },
  };
};

export const getExistingSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) {
    return null;
  }
  const registration = await getServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
};

export const subscribeToPush = async (vapidPublicKey: string): Promise<SerializedPushSubscription> => {
  if (!isPushSupported()) {
    throw new Error("Push-уведомления не поддерживаются в этом браузере.");
  }

  const registration = await getServiceWorkerRegistration();
  const existing = await registration.pushManager.getSubscription();

  if (existing) {
    return serializeSubscription(existing);
  }

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });

  return serializeSubscription(subscription);
};

export const unsubscribeFromPush = async (): Promise<string | null> => {
  if (!isPushSupported()) {
    return null;
  }
  const registration = await getServiceWorkerRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return null;
  }
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
};
