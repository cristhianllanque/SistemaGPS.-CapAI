import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_email_smtp(to_email: str, subject: str, html_content: str) -> bool:
    """
    Envía un correo electrónico HTML transaccional vía Brevo SMTP de forma segura.
    Retorna True si fue exitoso o False en caso de error, sin levantar excepciones.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("[EMAIL] Credenciales SMTP no configuradas. Omitiendo envío.")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
        msg['To'] = to_email
        msg['Reply-To'] = settings.EMAIL_FROM

        # Versión HTML enriquecida
        part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(part)

        # Conectar a Brevo SMTP Relay
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())

        logger.info(f"[EMAIL] Correo enviado exitosamente a {to_email} (Asunto: '{subject}')")
        print(f"[EMAIL] [OK] Correo enviado exitosamente a {to_email}", flush=True)
        return True

    except Exception as e:
        logger.error(f"[EMAIL ERROR] Error al enviar correo a {to_email}: {e}")
        print(f"[EMAIL ERROR] No se pudo enviar correo a {to_email}: {e}", flush=True)
        return False


def send_welcome_email(
    to_email: str, 
    nombre: str, 
    password_temp: str, 
    entidad_o_placa: str = None, 
    tipo: str = "particular",
    empresa_slug: str = None
) -> bool:
    """
    Envía el correo corporativo de bienvenida con credenciales y acceso directo
    al portal de la empresa cliente o a industriascopai.com.
    Diseño HTML responsivo, moderno y con alta entregabilidad en Gmail/Outlook.
    """
    es_empresa = (tipo == "empresa")
    
    if es_empresa and empresa_slug:
        if "industriascopai.com" in settings.FRONTEND_URL:
            login_url = f"https://{empresa_slug}.industriascopai.com/login?login=true"
        else:
            login_url = f"{settings.FRONTEND_URL}/login?empresa={empresa_slug}&login=true"
        subtitulo_tipo = f"Portal de Flota - {entidad_o_placa or 'Empresa'}"
        detalle_label = "Empresa / Flota:"
        bienvenida_msg = f"Tu cuenta de Gerencia / Administración ha sido activada exitosamente para la gestión de la flota de <strong>{entidad_o_placa or 'tu Empresa'}</strong> en nuestra plataforma de telemetría y rastreo satelital Copai."
        btn_label = f"🚀 Ingresar al Portal de {entidad_o_placa or 'tu Empresa'}"
    else:
        login_url = f"{settings.FRONTEND_URL}/login"
        subtitulo_tipo = "Vehículo Particular Registrado" if (tipo == "particular") else "Acceso a Plataforma"
        detalle_label = "Unidad / Placa:" if (tipo == "particular") else "Empresa / Cuenta:"
        bienvenida_msg = f"Te damos la bienvenida a <strong>Industrias Copai</strong>. Tu cuenta ha sido activada exitosamente en nuestra plataforma de telemetría y rastreo vehicular para el servicio de <strong>{subtitulo_tipo}</strong>."
        btn_label = "🚀 Ingresar a la Plataforma"
    
    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a Industrias Copai</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 30px 15px;">
            <tr>
                <td align="center">
                    <!-- Contenedor Principal -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                        
                        <!-- Header Corporativo -->
                        <tr>
                            <td align="center" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 35px 25px; text-align: center;">
                                <div style="display: inline-block; background: rgba(255, 255, 255, 0.1); padding: 8px 16px; border-radius: 30px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.15);">
                                    <span style="color: #38bdf8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Copai Telematics IoT</span>
                                </div>
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">INDUSTRIAS COPAI</h1>
                                <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px; font-weight: 400;">Monitoreo Satelital GPS & Control en Tiempo Real</p>
                            </td>
                        </tr>

                        <!-- Cuerpo del Correo -->
                        <tr>
                            <td style="padding: 35px 30px;">
                                <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 20px; font-weight: 700;">¡Hola, {nombre}! 👋</h2>
                                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                                    {bienvenida_msg}
                                </p>

                                <!-- Tarjeta de Credenciales -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 25px; padding: 20px;">
                                    <tr>
                                        <td>
                                            <p style="margin: 0 0 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                                                🔐 Tus Credenciales de Acceso
                                            </p>
                                            
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                    <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 140px;">Usuario / Correo:</td>
                                                    <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600;">{to_email}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Contraseña inicial:</td>
                                                    <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-family: monospace; font-weight: 700; background-color: #e2e8f0; padding: 3px 8px; border-radius: 4px; display: inline-block;">{password_temp}</td>
                                                </tr>
                                                {f'''
                                                <tr>
                                                    <td style="padding: 6px 0; font-size: 13px; color: #64748b;">{detalle_label}</td>
                                                    <td style="padding: 6px 0; font-size: 14px; color: #0284c7; font-weight: 700;">{entidad_o_placa}</td>
                                                </tr>
                                                ''' if entidad_o_placa else ''}
                                                {f'''
                                                <tr>
                                                    <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Acceso al Portal:</td>
                                                    <td style="padding: 6px 0; font-size: 12px; color: #16a34a; font-family: monospace; font-weight: 600;">{empresa_slug}.industriascopai.com</td>
                                                </tr>
                                                ''' if (es_empresa and empresa_slug) else ''}
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Botón CTA -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0 25px;">
                                    <tr>
                                        <td align="center">
                                            <a href="{login_url}" target="_blank" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 36px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                                                {btn_label}
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                                    O copia este enlace directo en tu navegador:<br>
                                    <a href="{login_url}" style="color: #2563eb; text-decoration: underline; word-break: break-all;">{login_url}</a>
                                </p>

                                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">

                                <!-- Aviso de Seguridad -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px;">
                                    <tr>
                                        <td style="font-size: 12px; color: #b45309; line-height: 1.4;">
                                            🛡️ <strong>Recomendación de Seguridad:</strong> Por protección de tu cuenta, te sugerimos cambiar tu contraseña temporal una vez que inicies sesión por primera vez.
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="color: #0f172a; font-size: 13px; font-weight: 700; margin: 0 0 4px;">Industrias Copai Telematics</p>
                                <p style="color: #64748b; font-size: 11px; margin: 0 0 10px;">Soluciones Integrales de Rastreo Satelital & Seguridad Vehicular</p>
                                <p style="color: #94a3b8; font-size: 10px; margin: 0;">
                                    Este es un correo automático enviado desde <strong>notificaciones@industriascopai.com</strong>.<br>
                                    © 2026 Industrias Copai. Todos los derechos reservados.
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    subject = f"🔐 Acceso a tu cuenta en Industrias Copai - {subtitulo_tipo}"
    return send_email_smtp(to_email=to_email, subject=subject, html_content=html)


def send_password_reset_email(to_email: str, nombre: str, reset_link: str) -> bool:
    """
    Envía el enlace seguro para recuperación de contraseña.
    """
    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><title>Recuperación de Contraseña</title></head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px;">
        <table align="center" width="100%" style="max-width: 550px; background-color: #ffffff; border-radius: 12px; padding: 30px; border: 1px solid #e2e8f0;">
            <tr>
                <td>
                    <h2 style="color: #0f172a; margin-top: 0;">Recuperación de Contraseña</h2>
                    <p style="color: #475569; font-size: 14px;">Hola <strong>{nombre}</strong>,</p>
                    <p style="color: #475569; font-size: 14px;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>Industrias Copai Telematics</strong>.</p>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                            Restablecer Mi Contraseña
                        </a>
                    </p>
                    <p style="color: #64748b; font-size: 12px;">Este enlace expirará en 2 horas. Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">Industrias Copai • notificaciones@industriascopai.com</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    subject = "Recuperación de Contraseña - Industrias Copai"
    return send_email_smtp(to_email=to_email, subject=subject, html_content=html)
