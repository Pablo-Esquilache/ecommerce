const Admin = require('../models/Admin');
const Cliente = require('../models/Cliente');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const crypto = require('crypto');
const emailService = require('../services/emailService');

const adminController = {
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const admin = await Admin.getByEmail(email);
      
      if (!admin) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const match = await bcrypt.compare(password, admin.password);
      if (!match) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Crear token
      const token = jwt.sign(
        { id: admin.id, email: admin.email, rol: 'admin' }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
      );

      res.json({ success: true, token, nombre: admin.nombre });
    } catch (error) {
      console.error("Login Error: ", error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  getDashboard: async (req, res) => {
    try {
      const stats = await Admin.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener métricas del dashboard' });
    }
  },

  getAllClientes: async (req, res) => {
    try {
      const clientes = await Cliente.getAll();
      res.json(clientes);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener clientes' });
    }
  },

  exportClientesExcel: async (req, res) => {
    try {
      const clientes = await Cliente.getAll();
      const xlsx = require('xlsx');
      
      const datosExcel = clientes.map(c => ({
          ID: c.id,
          Nombre: c.nombre,
          Apellido: c.apellido,
          Email: c.email,
          Teléfono: c.telefono || '',
          Género: c.genero || '',
          "DNI/CUIL": c.dni_cuil || '',
          Creado: new Date(c.creado_en || Date.now()).toLocaleDateString('es-AR')
      }));

      const ws = xlsx.utils.json_to_sheet(datosExcel);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Clientes");
      
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', 'attachment; filename="clientes.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    } catch (error) {
      console.error('Error exportando excel', error);
      res.status(500).json({ error: 'Error al exportar clientes' });
    }
  },

  updateConfiguracion: async (req, res) => {
    try {
      const {
        email, telefono, direccion, admin_nombre, email_admin,
        instagram_activo, instagram_url, facebook_activo, facebook_url,
        tiktok_activo, tiktok_url, twitter_activo, twitter_url,
        banner_activo, banner_texto,
        descuento_activo, descuento_porcentaje,
        envio_gratis_activo, envio_gratis_limite,
        sync_activo, sync_api_key,
        banco_nombre, banco_titular, banco_cuit, banco_cbu, banco_alias
      } = req.body;

      await db.query('INSERT INTO configuracion (id) VALUES (1) ON CONFLICT (id) DO NOTHING');

      const query = `
        UPDATE configuracion 
        SET 
          email = $1, telefono = $2, direccion = $3, admin_nombre = $4,
          instagram_activo = $5, instagram_url = $6, facebook_activo = $7, facebook_url = $8,
          tiktok_activo = $9, tiktok_url = $10, twitter_activo = $11, twitter_url = $12,
          banner_activo = $13, banner_texto = $14,
          descuento_activo = $15, descuento_porcentaje = $16,
          envio_gratis_activo = $17, envio_gratis_limite = $18,
          sync_activo = $19, sync_api_key = $20, email_admin = $21,
          banco_nombre = $22, banco_titular = $23, banco_cuit = $24, banco_cbu = $25, banco_alias = $26
        WHERE id = 1
        RETURNING *
      `;
      
      const values = [
        email||'', telefono||'', direccion||'', admin_nombre||'Admin',
        !!instagram_activo, instagram_url||'', !!facebook_activo, facebook_url||'',
        !!tiktok_activo, tiktok_url||'', !!twitter_activo, twitter_url||'',
        !!banner_activo, banner_texto||'',
        !!descuento_activo, descuento_porcentaje||0,
        !!envio_gratis_activo, envio_gratis_limite||0,
        !!sync_activo, sync_api_key||'', email_admin||'',
        banco_nombre||'', banco_titular||'', banco_cuit||'', banco_cbu||'', banco_alias||''
      ];

      const { rows } = await db.query(query, values);
      res.json({ success: true, configuracion: rows[0] });
    } catch (e) {
      console.error('Error actualizando configuracion', e);
      res.status(500).json({ error: 'Error interno' });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const admin = await Admin.getByEmail(email);
      if (!admin) {
        return res.status(404).json({ error: 'No existe un administrador con ese email' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000); // 1 hora de validez

      await Admin.setResetToken(admin.id, token, expires);

      const resetLink = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/admin/reset-password.html?token=${token}`;
      
      const htmlMsg = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h3 style="color: #2c3e50;">Recuperación de Contraseña</h3>
            <p>Hola <strong>${admin.nombre || 'Administrador'}</strong>,</p>
            <p>Hiciste una solicitud para restablecer la contraseña de acceso a tu Panel Administrativo. Haz clic en el siguiente enlace para continuar:</p>
            <p style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
                <a href="${resetLink}" style="padding: 12px 25px; background: #e74c3c; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer mi Contraseña</a>
            </p>
            <p style="color: #7f8c8d; font-size: 14px;">Si no fuiste tú o no reconoces esto, ignora por completo este mensaje. El enlace de arriba dejará de funcionar automáticamente en 60 minutos por razones de seguridad.</p>
        </div>
      `;

      await emailService.enviarCorreoHtml(email, 'Recuperación de Contraseña - E-Shopper', htmlMsg);

      res.json({ success: true, message: 'Enlace enviado al correo' });
    } catch (e) {
      console.error('Error enviando mail de recuperacion:', e);
      res.status(500).json({ error: 'Error interno al generar token' });
    }
  },
  
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      const admin = await Admin.getByResetToken(token);

      if (!admin) {
        return res.status(400).json({ error: 'Token inválido o expirado' });
      }

      if (new Date() > new Date(admin.reset_token_expires)) {
        return res.status(400).json({ error: 'El tiempo expiró. Empieza el trámite de nuevo.' });
      }

      const hashedLine = await bcrypt.hash(newPassword, 10);
      await Admin.updatePassword(admin.id, hashedLine);

      res.json({ success: true, message: '¡Tu nueva llave fue configurada exitosamente!' });
    } catch (e) {
      console.error('Error reseteando password:', e);
      res.status(500).json({ error: 'Falla silenciosa interna' });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const adminId = req.user.id; 

      const admin = await Admin.getById(adminId);
      if (!admin) return res.status(404).json({ error: 'La sesión caducó o el Admin no fue encontrado.' });

      const match = await bcrypt.compare(currentPassword, admin.password);
      if (!match) {
        return res.status(400).json({ error: 'La Clave actual no es correcta.' });
      }

      const hashedLine = await bcrypt.hash(newPassword, 10);
      await Admin.updatePassword(adminId, hashedLine);

      res.json({ success: true, message: 'Renovaste la cerradura a la perfección. Contraseña cambiada.' });
    } catch (e) {
      console.error('Error cambiando password:', e);
      res.status(500).json({ error: 'Error de servidor cambiando clave.' });
    }
  },

  requestChangeOtp: async (req, res) => {
    try {
      const { currentPassword } = req.body;
      const adminId = req.user.id;
      
      const admin = await Admin.getById(adminId);
      if (!admin) return res.status(404).json({ error: 'La sesión caducó.' });

      const match = await bcrypt.compare(currentPassword, admin.password);
      if (!match) {
        return res.status(400).json({ error: 'La Clave actual ingresada no es correcta.' });
      }

      // Generar 6 dígitos OTP aleatorios
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await Admin.setOtp(adminId, otp);

      // Despachar el OTP por Mail
      const htmlMsg = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #2C3E50;">Seguridad: Verificación Doble Factor (2FA)</h2>
          <p>Has solicitado cambiar la contraseña de tu tienda online. Para confirmar que efectivamente eres tú, ingresa este PIN de seguridad en tu Panel:</p>
          <div style="background: #f4f6f8; padding: 15px; margin: 25px 0; text-align: center; border-radius: 6px;">
             <h1 style="color: #3498db; letter-spacing: 10px; margin: 0; font-size: 32px;">${otp}</h1>
          </div>
          <p style="color: #7f8c8d; font-size: 13px;">Si tú no iniciaste este flujó de cambio de clave, alguien más conoce tu contraseña actual. Entra al panel e inicia el trámite para cambiarla tú mismo cuanto antes.</p>
        </div>
      `;
      const emailService = require('../services/emailService');
      await emailService.enviarCorreoHtml(admin.email, 'PIN de Seguridad: Cambio de Contraseña', htmlMsg);

      res.json({ success: true, message: 'Código OTP enviado al correo del comercio.' });
    } catch (e) {
      console.error('Error solicitando OTP:', e);
      res.status(500).json({ error: 'Error del servidor al intentar mandar el código de verificación.' });
    }
  },

  confirmChangeOtp: async (req, res) => {
    try {
      const { otp, newPassword } = req.body;
      const adminId = req.user.id;

      const admin = await Admin.getById(adminId);
      if (!admin) return res.status(404).json({ error: 'Administrador extraviado.' });

      if (!admin.otp_code || admin.otp_code !== otp) {
        return res.status(400).json({ error: 'El código ingresado es incorrecto.' });
      }

      const hashedLine = await bcrypt.hash(newPassword, 10);
      await Admin.updatePassword(adminId, hashedLine);
      await Admin.clearOtp(adminId);

      res.json({ success: true, message: '¡2FA Exitoso! Contraseña blindada y cambiada.' });
    } catch (e) {
      console.error('Error confirmando OTP:', e);
      res.status(500).json({ error: 'Fallo interno alterando la cuenta.' });
    }
  },

  getAllAdmins: async (req, res) => {
    try {
      const admins = await Admin.getAll();
      res.json(admins);
    } catch (e) {
      console.error('Error getAllAdmins:', e);
      res.status(500).json({ error: 'Error obteniendo administradores' });
    }
  },

  createAdmin: async (req, res) => {
    try {
      const { email, password, nombre } = req.body;
      if (!email || !password || !nombre) return res.status(400).json({ error: 'Faltan datos obligatorios' });
      
      const exists = await Admin.getByEmail(email);
      if (exists) return res.status(400).json({ error: 'El email ya está registrado' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newAdmin = await Admin.create(email, hashedPassword, nombre);
      res.status(201).json(newAdmin);
    } catch (e) {
      console.error('Error createAdmin:', e);
      res.status(500).json({ error: 'Error creando administrador' });
    }
  },

  deleteAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      // Prevenir que un admin se borre a sí mismo accidentalmente o borrar el único admin
      if (req.user.id == id) {
          return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' });
      }
      await Admin.delete(id);
      res.json({ success: true });
    } catch (e) {
      console.error('Error deleteAdmin:', e);
      res.status(500).json({ error: 'Error eliminando administrador' });
    }
  }
};

module.exports = adminController;
