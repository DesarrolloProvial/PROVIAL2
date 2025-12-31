import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UsuarioModel } from '../models/usuario.model';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { cache } from '../config/redis';

// Login
export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    // Validar inputs
    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password son requeridos' });
    }

    // Buscar usuario
    const usuario = await UsuarioModel.findByUsername(username);
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar que esté activo
    if (!usuario.activo) {
      return res.status(403).json({ error: 'Usuario desactivado. Contacte al administrador.' });
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Actualizar último acceso
    await UsuarioModel.updateLastAccess(usuario.id);

    // Generar tokens
    const accessToken = generateAccessToken({
      userId: usuario.id,
      rol: usuario.rol_nombre!,
      sede: usuario.sede_id || undefined,
      puede_ver_todas_sedes: usuario.puede_ver_todas_sedes || false,
      // Incluir sub-rol COP si existe
      sub_rol_cop_id: usuario.sub_rol_cop_id || undefined,
      sub_rol_cop_codigo: usuario.sub_rol_cop_codigo || undefined,
    });

    const { token: refreshToken, tokenId } = generateRefreshToken(usuario.id);

    // Guardar refresh token en Redis
    await cache.set(
      `refresh_token:${usuario.id}:${tokenId}`,
      { userId: usuario.id, tokenId },
      7 * 24 * 60 * 60 // 7 días
    );

    // Construir objeto subRolCop solo si el usuario es COP y tiene sub-rol
    const subRolCop = usuario.rol_nombre === 'COP' && usuario.sub_rol_cop_id ? {
      id: usuario.sub_rol_cop_id,
      codigo: usuario.sub_rol_cop_codigo,
      nombre: usuario.sub_rol_cop_nombre,
      puede_crear_persistentes: usuario.puede_crear_persistentes || false,
      puede_cerrar_persistentes: usuario.puede_cerrar_persistentes || false,
      puede_promover_situaciones: usuario.puede_promover_situaciones || false,
      puede_asignar_unidades: usuario.puede_asignar_unidades || false,
      solo_lectura: usuario.solo_lectura || false,
    } : null;

    // Responder
    return res.json({
      message: 'Login exitoso',
      user: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre_completo,
        rol: usuario.rol_nombre,
        sede_id: usuario.sede_id,
        sede_nombre: usuario.sede_nombre,
        puede_ver_todas_sedes: usuario.puede_ver_todas_sedes || false,
        subRolCop,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Refresh token
export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token es requerido' });
    }

    // Verificar refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }

    // Verificar que exista en Redis
    const cached = await cache.get(`refresh_token:${payload.userId}:${payload.tokenId}`);
    if (!cached) {
      return res.status(401).json({ error: 'Refresh token revocado' });
    }

    // Buscar usuario
    const usuario = await UsuarioModel.findById(payload.userId);
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no válido' });
    }

    // Generar nuevo access token
    const accessToken = generateAccessToken({
      userId: usuario.id,
      rol: usuario.rol_nombre!,
      sede: usuario.sede_id || undefined,
      puede_ver_todas_sedes: usuario.puede_ver_todas_sedes || false,
      // Incluir sub-rol COP si existe
      sub_rol_cop_id: usuario.sub_rol_cop_id || undefined,
      sub_rol_cop_codigo: usuario.sub_rol_cop_codigo || undefined,
    });

    return res.json({
      accessToken,
    });
  } catch (error) {
    console.error('Error en refresh:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Logout
export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const payload = verifyRefreshToken(refreshToken);
      if (payload) {
        // Eliminar de Redis
        await cache.del(`refresh_token:${payload.userId}:${payload.tokenId}`);
      }
    }

    return res.json({ message: 'Logout exitoso' });
  } catch (error) {
    console.error('Error en logout:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Obtener usuario actual
export async function me(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const usuario = await UsuarioModel.findById(req.user.userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Construir objeto subRolCop solo si el usuario es COP y tiene sub-rol
    const subRolCop = usuario.rol_nombre === 'COP' && usuario.sub_rol_cop_id ? {
      id: usuario.sub_rol_cop_id,
      codigo: usuario.sub_rol_cop_codigo,
      nombre: usuario.sub_rol_cop_nombre,
      puede_crear_persistentes: usuario.puede_crear_persistentes || false,
      puede_cerrar_persistentes: usuario.puede_cerrar_persistentes || false,
      puede_promover_situaciones: usuario.puede_promover_situaciones || false,
      puede_asignar_unidades: usuario.puede_asignar_unidades || false,
      solo_lectura: usuario.solo_lectura || false,
    } : null;

    return res.json({
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre_completo,
      email: usuario.email,
      telefono: usuario.telefono,
      rol: usuario.rol_nombre,
      sede: usuario.sede_nombre,
      ultimo_acceso: usuario.ultimo_acceso,
      subRolCop,
    });
  } catch (error) {
    console.error('Error en me:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
