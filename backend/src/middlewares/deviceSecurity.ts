/**
 * Middleware: Seguridad por Dispositivo
 *
 * Tres capas de protección:
 *
 * 1. BLACKLIST GLOBAL — cualquier dispositivo (móvil o web) que dispare
 *    más de RATE_LIMIT_MAX peticiones en RATE_LIMIT_WINDOW_MS queda bloqueado
 *    automáticamente en dispositivo_blacklist.
 *
 * 2. WHITELIST MÓVIL — cuando el cliente es la app móvil (X-App-Platform: mobile)
 *    se exige que IMEI + UUID estén en dispositivo_autorizado con estado = 'APROBADO'.
 *    Si el dispositivo no existe se registra como PENDIENTE y se rechaza con 403.
 *
 * 3. CONFIGURACIÓN DINÁMICA — la clave 'whitelist_movil_activa' en
 *    configuracion_sistema permite habilitar/deshabilitar el filtro sin redespliegue.
 *
 * Headers que el cliente móvil DEBE enviar:
 *   X-App-Platform : "mobile"
 *   X-Device-IMEI  : "<IMEI del dispositivo>"
 *   X-Device-UUID  : "<UUID instalación de la app>"
 *   X-Device-Model : "<modelo>" (opcional, enriquece el registro)
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

// ─── Configuración de rate limiting ─────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;  // ventana de 1 minuto
const RATE_LIMIT_MAX       = 120;     // máximo de requests por ventana

interface RateEntry { count: number; windowStart: number; }
const rateMap = new Map<string, RateEntry>();

function getRateLimitKey(req: Request): string {
  const ip       = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip ?? 'unknown';
  const deviceId = req.headers['x-device-uuid'] as string | undefined;
  return deviceId ? `${ip}::${deviceId}` : ip;
}

function exceedsRateLimit(key: string): boolean {
  const now   = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateMap.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// ─── Helpers de BD ──────────────────────────────────────────────────────────

async function isBlacklisted(key: string): Promise<boolean> {
  const row = await db.oneOrNone(
    `SELECT id FROM dispositivo_blacklist WHERE clave = $1 AND activo = true LIMIT 1`,
    [key]
  );
  return !!row;
}

async function addToBlacklist(key: string, motivo: string): Promise<void> {
  await db.none(
    `INSERT INTO dispositivo_blacklist (clave, motivo, activo)
     VALUES ($1, $2, true)
     ON CONFLICT (clave) DO UPDATE
       SET activo = true, motivo = EXCLUDED.motivo, updated_at = NOW()`,
    [key, motivo]
  );
}

async function isWhitelistActiva(): Promise<boolean> {
  const row = await db.oneOrNone(
    `SELECT valor FROM configuracion_sistema WHERE clave = 'whitelist_movil_activa' LIMIT 1`
  );
  return row?.valor === 'true' || row?.valor === true;
}

async function isMobileAccessEnabled(): Promise<boolean> {
  const row = await db.oneOrNone(
    `SELECT valor FROM configuracion_sistema WHERE clave = 'dispositivos_por_unidad' LIMIT 1`
  );
  return row?.valor !== '0' && row?.valor !== 0;
}

async function checkWhitelistMovil(
  imei: string,
  uuid: string,
  model?: string
): Promise<'APROBADO' | 'PENDIENTE' | 'BLOQUEADO'> {
  // device_id canónico para móvil: "IMEI:UUID"
  const deviceId = `${imei}:${uuid}`;

  const row = await db.oneOrNone<{ id: number; estado: string }>(
    `SELECT id, estado FROM dispositivo_autorizado WHERE device_id = $1 LIMIT 1`,
    [deviceId]
  );

  if (!row) {
    await db.none(
      `INSERT INTO dispositivo_autorizado (device_id, device_model, estado)
       VALUES ($1, $2, 'PENDIENTE')
       ON CONFLICT (device_id) DO NOTHING`,
      [deviceId, model ?? null]
    );
    return 'PENDIENTE';
  }

  await db.none(
    `UPDATE dispositivo_autorizado SET ultimo_acceso_at = NOW() WHERE id = $1`,
    [row.id]
  );

  return row.estado as 'APROBADO' | 'PENDIENTE' | 'BLOQUEADO';
}

// ─── Middleware principal ────────────────────────────────────────────────────

export async function deviceSecurity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Ignorar peticiones preflight CORS (no traen headers custom)
    if (req.method === 'OPTIONS') {
      return next();
    }

    const key = getRateLimitKey(req);

    // 1. Blacklist global en BD
    if (await isBlacklisted(key)) {
      res.status(403).json({ error: 'Acceso bloqueado', code: 'DEVICE_BLACKLISTED' });
      return;
    }

    // 2. Rate limiting → si supera el límite, blacklistear automáticamente
    if (exceedsRateLimit(key)) {
      await addToBlacklist(key, `Rate limit superado: >${RATE_LIMIT_MAX} req/${RATE_LIMIT_WINDOW_MS}ms`);
      res.status(429).json({
        error: 'Demasiadas peticiones. Tu acceso ha sido bloqueado.',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    // 3. Verificación ESTRICTA de plataforma
    const platform = (req.headers['x-app-platform'] as string | undefined)?.toLowerCase();
    
    if (!platform || !['mobile', 'web'].includes(platform)) {
      res.status(403).json({
        error: 'Petición bloqueada. Declaración de plataforma (X-App-Platform) requerida.',
        code: 'MISSING_OR_INVALID_PLATFORM'
      });
      return;
    }

    // 4. Modo "Ignorar Móvil" global
    if (platform === 'mobile') {
      const mobileHabilitado = await isMobileAccessEnabled();
      if (!mobileHabilitado) {
        res.status(403).json({
          error: 'Acceso móvil deshabilitado por política de la institución. Reporte exclusivamente operando a través del COP.',
          code: 'MOBILE_ACCESS_DISABLED'
        });
        return;
      }

      // 5. Whitelist solo para clientes móviles

      const whitelistActiva = await isWhitelistActiva();
      if (whitelistActiva) {
        const imei  = req.headers['x-device-imei']  as string | undefined;
        const uuid  = req.headers['x-device-uuid']  as string | undefined;
        const model = req.headers['x-device-model'] as string | undefined;

        if (!imei || !uuid) {
          res.status(403).json({
            error: 'Dispositivo no identificado. IMEI y UUID son requeridos.',
            code: 'MISSING_DEVICE_HEADERS',
          });
          return;
        }

        const estado = await checkWhitelistMovil(imei, uuid, model);

        if (estado === 'PENDIENTE') {
          res.status(403).json({
            error: 'Dispositivo pendiente de aprobación. Contacta al administrador.',
            code: 'DEVICE_PENDING',
          });
          return;
        }

        if (estado === 'BLOQUEADO') {
          res.status(403).json({
            error: 'Tu acceso ha sido revocado. Dispositivo bloqueado.',
            code: 'DEVICE_BLOCKED',
          });
          return;
        }
        // 'APROBADO' → continúa
      }
    }

    next();
  } catch (err) {
    console.error('[deviceSecurity] Error en middleware:', err);
    // Fail-open: si la BD falla no bloqueamos el sistema entero.
    // Cambiar a fail-closed cuando la infraestructura esté estabilizada.
    next();
  }
}
