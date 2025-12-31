import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { v4 as uuidv4 } from 'uuid';

export interface JWTPayload {
  userId: number;
  rol: string;
  sede?: number;
  puede_ver_todas_sedes?: boolean;
  // Sub-rol COP (solo para usuarios COP)
  sub_rol_cop_id?: number;
  sub_rol_cop_codigo?: string;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenId: string;
}

// Generar Access Token
export function generateAccessToken(payload: JWTPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as any,
  };
  return jwt.sign(payload, config.jwt.secret, options);
}

// Generar Refresh Token
export function generateRefreshToken(userId: number): { token: string; tokenId: string } {
  const tokenId = uuidv4();
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as any,
  };
  const token = jwt.sign(
    { userId, tokenId } as RefreshTokenPayload,
    config.jwt.refreshSecret,
    options
  );
  return { token, tokenId };
}

// Verificar Access Token
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

// Verificar Refresh Token
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const payload = jwt.verify(token, config.jwt.refreshSecret) as RefreshTokenPayload;
    return payload;
  } catch (error) {
    return null;
  }
}
