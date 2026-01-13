/**
 * Middleware de Idempotencia
 * Permite reintentos seguros sin duplicar operaciones
 *
 * Uso:
 * router.post('/drafts', authenticate, idempotency, createDraft);
 *
 * El cliente debe enviar header: Idempotency-Key: <UUID>
 * Si el mismo key llega de nuevo, devuelve la respuesta cacheada.
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import crypto from 'crypto';

/**
 * Verificar si existe una respuesta cacheada para este Idempotency-Key
 */
async function checkIdempotencyKey(key: string): Promise<{
  exists: boolean;
  response?: any;
  status?: number;
} | null> {
  try {
    const cached = await db.oneOrNone(
      `SELECT response_json, response_status
       FROM idempotency_keys
       WHERE key = $1 AND expires_at > NOW()`,
      [key]
    );

    if (!cached) {
      return null;
    }

    return {
      exists: true,
      response: cached.response_json,
      status: cached.response_status
    };
  } catch (error) {
    console.error('[IDEMPOTENCY] Error checking key:', error);
    return null;
  }
}

/**
 * Guardar respuesta en cache
 */
async function saveIdempotencyKey(
  key: string,
  endpoint: string,
  requestBodyHash: string,
  responseStatus: number,
  responseBody: any
): Promise<void> {
  try {
    await db.none(
      `INSERT INTO idempotency_keys (key, endpoint, request_body_hash, response_status, response_json)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO NOTHING`,
      [key, endpoint, requestBodyHash, responseStatus, responseBody]
    );
  } catch (error) {
    console.error('[IDEMPOTENCY] Error saving key:', error);
    // No lanzar error - si falla el cache, no pasa nada
  }
}

/**
 * Generar hash del body del request
 */
function hashRequestBody(body: any): string {
  const bodyString = JSON.stringify(body);
  return crypto.createHash('sha256').update(bodyString).digest('hex');
}

/**
 * Middleware de idempotencia
 */
export function idempotency(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  // Si no hay key, continuar normal (opcional)
  if (!idempotencyKey) {
    return next();
  }

  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyKey)) {
    return res.status(400).json({
      error: 'Idempotency-Key inválido',
      message: 'Debe ser un UUID válido'
    });
  }

  // Verificar si existe respuesta cacheada
  checkIdempotencyKey(idempotencyKey).then((cached) => {
    if (cached && cached.exists) {
      console.log(`[IDEMPOTENCY] Request duplicado detectado: ${idempotencyKey}`);
      console.log(`[IDEMPOTENCY] Devolviendo respuesta cacheada (status ${cached.status})`);

      // Devolver respuesta cacheada
      return res.status(cached.status || 200).json(cached.response);
    }

    // No existe cache - continuar con el request
    // Pero interceptar la respuesta para guardarla

    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);

    let responseStatus = 200;

    // Interceptar res.status() para capturar el código
    res.status = function (code: number) {
      responseStatus = code;
      return originalStatus(code);
    };

    // Interceptar res.json() para cachear la respuesta
    res.json = function (body: any) {
      const endpoint = `${req.method} ${req.path}`;
      const bodyHash = hashRequestBody(req.body);

      // Guardar en cache (asíncrono, no bloqueante)
      saveIdempotencyKey(
        idempotencyKey,
        endpoint,
        bodyHash,
        responseStatus,
        body
      ).catch((error) => {
        console.error('[IDEMPOTENCY] Error guardando en cache:', error);
      });

      console.log(`[IDEMPOTENCY] Respuesta cacheada: ${idempotencyKey} (status ${responseStatus})`);

      // Devolver respuesta original
      return originalJson(body);
    };

    next();
  }).catch((error) => {
    console.error('[IDEMPOTENCY] Error en middleware:', error);
    // Si falla el middleware, continuar normal (no romper el request)
    next();
  });
}

/**
 * Limpiar keys expiradas (ejecutar periódicamente)
 */
export async function cleanupExpiredKeys(): Promise<number> {
  try {
    const result = await db.func('cleanup_expired_idempotency_keys');
    const count = result[0]?.cleanup_expired_idempotency_keys || 0;
    console.log(`[IDEMPOTENCY] Limpieza: ${count} keys expiradas eliminadas`);
    return count;
  } catch (error) {
    console.error('[IDEMPOTENCY] Error en cleanup:', error);
    return 0;
  }
}
