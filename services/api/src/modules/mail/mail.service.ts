import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Gửi email qua SMTP (mặc định cấu hình cho Gmail).
 *
 * Nếu chưa cấu hình SMTP_USER / SMTP_PASS (môi trường dev), email sẽ KHÔNG được gửi
 * mà nội dung (bao gồm mã OTP) được in ra console của API để tiện test.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT ?? 465);

    this.from = process.env.MAIL_FROM ?? `TORCH SPORTS <${user ?? 'no-reply@torchsports.vn'}>`;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP chưa được cấu hình (SMTP_USER / SMTP_PASS). Mã OTP sẽ được in ra console thay vì gửi email.',
      );
    }
  }

  async sendPasswordResetCode(to: string, name: string, code: string, ttlMinutes: number) {
    const subject = `[TORCH SPORTS] Mã đặt lại mật khẩu: ${code}`;
    const html = this.passwordResetTemplate(name, code, ttlMinutes);
    const text = `Xin chào ${name},\n\nMã đặt lại mật khẩu TORCH SPORTS của bạn là: ${code}\nMã có hiệu lực trong ${ttlMinutes} phút.\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`;

    await this.send(to, subject, html, text);
  }

  async sendRegisterCode(to: string, name: string, code: string, ttlMinutes: number) {
    const subject = `[TORCH SPORTS] Mã xác thực đăng ký tài khoản: ${code}`;
    const html = this.registerTemplate(name, code, ttlMinutes);
    const text = `Xin chào ${name},\n\nMã xác thực đăng ký tài khoản TORCH SPORTS của bạn là: ${code}\nMã có hiệu lực trong ${ttlMinutes} phút.\n\nNếu bạn không thực hiện đăng ký, hãy bỏ qua email này.`;

    await this.send(to, subject, html, text);
  }

  private async send(to: string, subject: string, html: string, text: string) {
    if (!this.transporter) {
      this.logger.log(`\n📧 [DEV MAIL] To: ${to}\n   Subject: ${subject}\n   ${text.replace(/\n/g, '\n   ')}\n`);
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html, text });
    } catch (error) {
      this.logger.error(`Gửi email tới ${to} thất bại`, error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException('Không thể gửi email lúc này. Vui lòng thử lại sau.');
    }
  }

  private registerTemplate(name: string, code: string, ttlMinutes: number) {
    const safeName = name.replace(/[<>&"]/g, '');
    return `
<!DOCTYPE html>
<html lang="vi">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#003366,#00c6ff);padding:28px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:2px;">🔥 TORCH SPORTS</h1>
          </td></tr>
          <tr><td style="padding:32px;color:#1f2937;">
            <p style="margin:0 0 12px;font-size:16px;">Xin chào <strong>${safeName}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4b5563;">
              Cảm ơn bạn đã đăng ký tài khoản tại <strong>TORCH SPORTS</strong>. Vui lòng nhập mã OTP xác thực 6 chữ số dưới đây để kích hoạt tài khoản:
            </p>
            <div style="text-align:center;margin:0 0 24px;">
              <span style="display:inline-block;padding:16px 32px;background:#f0f9ff;border:2px dashed #00c6ff;border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:10px;color:#003366;">${code}</span>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">⏱ Mã xác thực có hiệu lực trong <strong>${ttlMinutes} phút</strong>.</p>
            <p style="margin:0;font-size:13px;color:#6b7280;">🔒 Đây là mã bảo mật để chống bot/spam. Không chia sẻ mã này với bất kỳ ai.</p>
          </td></tr>
          <tr><td style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
            © ${new Date().getFullYear()} TORCH SPORTS. All rights reserved.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  }

  private passwordResetTemplate(name: string, code: string, ttlMinutes: number) {
    const safeName = name.replace(/[<>&"]/g, '');
    return `
<!DOCTYPE html>
<html lang="vi">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#003366,#00c6ff);padding:28px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:2px;">🔥 TORCH SPORTS</h1>
          </td></tr>
          <tr><td style="padding:32px;color:#1f2937;">
            <p style="margin:0 0 12px;font-size:16px;">Xin chào <strong>${safeName}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4b5563;">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhập mã bên dưới để tiếp tục:
            </p>
            <div style="text-align:center;margin:0 0 24px;">
              <span style="display:inline-block;padding:16px 32px;background:#f0f9ff;border:2px dashed #00c6ff;border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:10px;color:#003366;">${code}</span>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">⏱ Mã có hiệu lực trong <strong>${ttlMinutes} phút</strong>.</p>
            <p style="margin:0;font-size:13px;color:#6b7280;">🔒 Không chia sẻ mã này với bất kỳ ai. Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu của bạn vẫn an toàn.</p>
          </td></tr>
          <tr><td style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
            © ${new Date().getFullYear()} TORCH SPORTS. All rights reserved.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  }
}
