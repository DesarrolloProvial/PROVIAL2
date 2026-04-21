import * as admin from 'firebase-admin';

let firebaseInitialized = false;

export function initializeFirebase(): void {
  // Si ya hay una app inicializada (e.g. hot-reload o entorno compartido), reusar
  if (admin.apps.length > 0) {
    firebaseInitialized = true;
    return;
  }
  if (firebaseInitialized) return;

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;

    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
    firebaseInitialized = true;
    console.log('Firebase Admin inicializado correctamente');
  } catch (error) {
    console.warn('Firebase Admin no inicializado:', error);
  }
}

export function isFirebaseReady(): boolean {
  return firebaseInitialized;
}

export function isInvalidToken(errorCode: string): boolean {
  return (
    errorCode === 'messaging/invalid-registration-token' ||
    errorCode === 'messaging/registration-token-not-registered'
  );
}

export function normalizeDataPayload(datos?: Record<string, any>, tipo?: string): Record<string, string> {
  const payload: Record<string, string> = {};
  if (datos) {
    for (const [key, value] of Object.entries(datos)) {
      payload[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
  }
  if (tipo) payload.tipo = tipo;
  return payload;
}

export async function sendEach(messages: admin.messaging.Message[]): Promise<admin.messaging.BatchResponse> {
  return admin.messaging().sendEach(messages);
}

export async function subscribeToTopic(token: string, topic: string): Promise<boolean> {
  if (!firebaseInitialized) return false;
  try {
    await admin.messaging().subscribeToTopic(token, topic);
    return true;
  } catch (error) {
    console.error('Error suscribiendo a topic:', error);
    return false;
  }
}

export async function sendToTopic(
  topic: string,
  titulo: string,
  mensaje: string,
  datos?: Record<string, any>,
): Promise<boolean> {
  if (!firebaseInitialized) return false;
  try {
    await admin.messaging().send({
      topic,
      notification: { title: titulo, body: mensaje },
      data: normalizeDataPayload(datos),
    });
    return true;
  } catch (error) {
    console.error('Error enviando a topic:', error);
    return false;
  }
}
