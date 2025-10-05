/* ── emailVerificationTemplate (Capitalise CGFX • responsive + CTA) ─────────
 */ export function emailVerificationTemplate(
  code: string,
  url: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <!-- mobile-first rendering -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Verification - Capitalise CGFX</title>

    <style>
      /* webfont (falls back gracefully in most clients) */
      @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap");

      /* ── base ───────────────────────────────────────────── */
      body {
        margin: 0;
        padding: 0;
        background-color: #f8fafc;
        font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI",
          Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji",
          "Segoe UI Symbol", sans-serif;
        color: #1e293b;
        line-height: 1.6;
        -webkit-text-size-adjust: 100%;
      }

      /* ── container ───────────────────────────────────────── */
      .container {
        max-width: 600px;
        margin: 24px auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
        border: 1px solid #e2e8f0;
      }

      /* ── header (brand gradient) ─────────────────────────── */
      .header {
        background: linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%);
        padding: 28px 20px;
        text-align: center;
        color: white;
        position: relative;
        overflow: hidden;
      }
      .header::before {
        content: "";
        position: absolute;
        top: -50px;
        right: -50px;
        width: 150px;
        height: 150px;
        background: rgba(255, 255, 255, 0.12);
        border-radius: 50%;
      }
      .logo {
        font-size: 26px;
        font-weight: 700;
        margin: 0;
        position: relative;
        z-index: 1;
        letter-spacing: 0.2px;
      }
      .logo span {
        color: #facc15;
      } /* accent */

      /* ── content ─────────────────────────────────────────── */
      .content {
        padding: 28px 20px;
      }
      .title {
        font-size: 20px; /* mobile-first */
        font-weight: 600;
        color: #111827;
        margin: 0 0 18px 0;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .title .icon {
        font-size: 22px;
      }

      /* ── 6-digit code ────────────────────────────────────── */
      .verification-code {
        background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%);
        color: #0ea5e9;
        text-align: center;
        padding: 22px;
        font-size: 36px;
        font-weight: 800;
        border-radius: 12px;
        margin: 22px 0;
        letter-spacing: 6px;
        border: 1px dashed #a7f3d0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          "Liberation Mono", "Courier New", monospace;
      }

      /* ── CTA button ──────────────────────────────────────── */
      .cta {
        text-align: center;
        margin: 16px 0 6px;
      }
      .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%);
        color: #ffffff !important;
        text-decoration: none;
        padding: 12px 22px;
        border-radius: 10px;
        font-weight: 700;
        box-shadow: 0 4px 10px rgba(2, 132, 199, 0.25);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .cta-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 14px rgba(2, 132, 199, 0.35);
      }

      /* ── security note ───────────────────────────────────── */
      .security-note {
        background: #fff7ed;
        border-left: 4px solid #f59e0b;
        padding: 14px;
        border-radius: 10px;
        margin: 18px 0;
        font-size: 14px;
        color: #7c2d12;
      }

      /* ── footer ──────────────────────────────────────────── */
      .footer {
        background: #f1f5f9;
        text-align: center;
        padding: 16px;
        font-size: 12.5px;
        color: #64748b;
        border-top: 1px solid #e2e8f0;
      }
      .footer a {
        color: #0ea5e9;
        text-decoration: none;
        font-weight: 600;
      }

      /* ── desktop upscale (≥ 600px) ───────────────────────── */
      @media (min-width: 600px) {
        .container {
          margin: 40px auto;
        }
        .content {
          padding: 40px 30px;
        }
        .logo {
          font-size: 28px;
        }
        .title {
          font-size: 24px;
        }
        .title .icon {
          font-size: 24px;
        }
        .verification-code {
          font-size: 42px;
          padding: 25px;
        }
      }

      /* ── tiny screens (≤ 360px) ──────────────────────────── */
      @media (max-width: 360px) {
        .verification-code {
          letter-spacing: 4px;
        }
        .cta-button {
          width: 100%;
        }
      }
    </style>
  </head>

  <body>
    <div class="container">
      <!-- ── header ── -->
      <div class="header">
        <h1 class="logo">Capitalise <span>CGFX</span></h1>
      </div>

      <!-- ── content ── -->
      <div class="content">
        <h2 class="title">
          <span class="icon">✉️</span> Verify Your Email Address
        </h2>

        <p style="margin: 0 0 10px 0">Hello valued Capitalise CGFX member,</p>
        <p style="margin: 0 0 10px 0">
          Thank you for registering with <strong>Capitalise CGFX</strong>. To
          complete your account setup, please use the verification code below:
        </p>

        <!-- ── big one-time code ── -->
        <div class="verification-code">${code}</div>

        <!-- ── direct verify link ── -->
        <div class="cta">
          <a href="${url}" class="cta-button">Verify Email</a>
        </div>

        <!-- ── note ── -->
        <div class="security-note">
          <strong>Security Alert:</strong> This code will expire in
          <strong>30 minutes</strong>. Never share this code with anyone. If you
          didn't request this, please secure your account by changing your
          password and enabling 2FA.
        </div>

        <p style="margin: 0">
          Welcome to the Capitalise CGFX community where we prioritize your
          security and trading experience.
        </p>
      </div>

      <!-- ── footer ── -->
      <div class="footer">
        &copy; 2025
        <a href="https://www.capitalisegfx.com/">Capitalise CGFX</a>. All rights
        reserved.<br />
        Always verify you're on our official website before entering any
        credentials.
      </div>
    </div>
  </body>
</html>
`;
}
