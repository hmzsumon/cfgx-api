import nodemailer from "nodemailer";

interface SendEmailOptions {
  email: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      host: "mail.privateemail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || "service@capitalisegfx.com",
        pass: process.env.EMAIL_PASS || "Asad@1563",
      },
    });

    const info = await transporter.sendMail({
      from: `"CapitaliseGfx" <${
        process.env.EMAIL_USER || "service@capitalisegfx.com"
      }>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    });

    console.log(`📧 Email sent: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Preview: ${previewUrl}`);
    }
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error("Email send failed");
  }
};
