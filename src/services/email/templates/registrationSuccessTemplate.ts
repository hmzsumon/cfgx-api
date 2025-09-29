export interface RegistrationData {
	name: string;
	email: string;
	password: string;
}
const registrationSuccessTemplate = ({
	name,
	email,
	password,
}: RegistrationData): string => {
	return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome to H5Fivex</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
  
        body {
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
          font-family: 'Poppins', sans-serif;
          color: #1e293b;
          line-height: 1.6;
        }
  
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
  
        .header {
          background: linear-gradient(135deg, #6b46c1 0%, #805ad5 100%);
          padding: 30px 20px;
          text-align: center;
          color: white;
          position: relative;
          overflow: hidden;
        }
  
        .header::before {
          content: '';
          position: absolute;
          top: -50px;
          right: -50px;
          width: 150px;
          height: 150px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
        }
  
        .logo {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          position: relative;
          z-index: 1;
        }
  
        .logo span {
          color: #f6e05e;
        }
  
        .tagline {
          font-size: 14px;
          opacity: 0.9;
          margin-top: 5px;
          position: relative;
          z-index: 1;
        }
  
        .content {
          padding: 40px 30px;
        }
  
        .title {
          font-size: 24px;
          font-weight: 600;
          color: #2d3748;
          margin-top: 0;
          margin-bottom: 25px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
  
        .title .icon {
          font-size: 28px;
        }
  
        .credentials-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          border-left: 4px solid #6b46c1;
        }
  
        .credential-item {
          margin-bottom: 15px;
          display: flex;
          align-items: flex-start;
        }
  
        .credential-item:last-child {
          margin-bottom: 0;
        }
  
        .credential-label {
          font-weight: 600;
          color: #4a5568;
          min-width: 80px;
        }
  
        .credential-value {
          flex: 1;
          word-break: break-word;
        }
  
        .security-alert {
          background: #fff5f5;
          border-left: 4px solid #f56565;
          padding: 15px;
          border-radius: 8px;
          margin: 25px 0;
          font-size: 14px;
        }
  
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #6b46c1 0%, #805ad5 100%);
          color: white;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 8px;
          font-weight: 500;
          margin: 20px 0;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
  
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }
  
        .footer {
          background: #f1f5f9;
          text-align: center;
          padding: 20px;
          font-size: 13px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
  
        .footer a {
          color: #6b46c1;
          text-decoration: none;
          font-weight: 500;
        }
  
        .auto-note {
          font-size: 13px;
          color: #64748b;
          text-align: center;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo"><span>H5</span>Fivex</h1>
        </div>
  
        <div class="content">
          <h2 class="title"><span class="icon">🎉</span> Welcome to H5Fivex!</h2>
  
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            We're thrilled to welcome you to H5Fivex - your gateway to secure and
            efficient digital asset management.
          </p>
  
          <div class="credentials-card">
            <div class="credential-item">
              <div class="credential-label">Email:</div>
              <div class="credential-value">${email}</div>
            </div>
  
            <div class="credential-item">
              <div class="credential-label">Password:</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>
  
          <div class="security-alert">
            <strong>Security Tip:</strong> For your protection, we recommend
            changing your password immediately after first login and enabling
            two-factor authentication (2FA) in your account settings.
          </div>
  
          <center>
            <a href="https://www.h5fivex.com/login" class="cta-button"
              >Login to Your Account</a
            >
          </center>
  
          <p>With your H5Fivex account, you can now:</p>
          <ul style="margin-top: 5px; padding-left: 20px">
            <li>Trade digital assets with our advanced platform</li>
            <li>Access real-time market data and analytics</li>
            <li>Enjoy secure wallet services</li>
            <li>Benefit from our 24/7 customer support</li>
          </ul>
  
          <p class="auto-note">
            This is an automated message. Please do not reply directly to this
            email.
          </p>
        </div>
  
        <div class="footer">
          <div>
            &copy; 2025 <a href="https://www.h5fivex.com/">H5Fivex</a>. All rights
            reserved.
          </div>
          <div style="margin-top: 8px">
            Stay safe and never share your login credentials with anyone.
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
};
export default registrationSuccessTemplate;
