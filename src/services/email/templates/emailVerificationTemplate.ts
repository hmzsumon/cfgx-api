// src/templates/registrationTemplate.ts
export function emailVerificationTemplate(code: string, url: string): string {
  return `<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>Email Verification - CapitaliseGfx</title>
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
					color: #6b46c1;
				}
				.verification-code {
					background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
					color: #6b46c1;
					text-align: center;
					padding: 25px;
					font-size: 42px;
					font-weight: 700;
					border-radius: 12px;
					margin: 30px 0;
					letter-spacing: 5px;
					border: 1px dashed #a78bfa;
					font-family: 'Courier New', monospace;
				}
				.security-note {
					background: #fff5f5;
					border-left: 4px solid #f56565;
					padding: 15px;
					border-radius: 8px;
					margin: 25px 0;
					font-size: 14px;
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
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1 class="logo">Capitalise<span>Gfx</span></h1>
				</div>
	
				<div class="content">
					<h2 class="title">
						<span class="icon">✉️</span> Verify Your Email Address
					</h2>
					<p>Hello valued CapitaliseGfx member,</p>
					<p>
						Thank you for registering with CapitaliseGfx. To complete your account
						setup, please use the following verification code:
					</p>
					<div class="verification-code">${code}</div>
					<div class="security-note">
						<strong>Security Alert:</strong> This code will expire in
						<strong>30 minutes</strong>. Never share this code with anyone.
					</div>
					<p>
						If you didn't request this code, please secure your account
						immediately by changing your password and enabling two-factor
						authentication.
					</p>
					
					<p>
						Welcome to the CapitaliseGfx community where we prioritize your security and
						trading experience.
					</p>
				</div>
	
				<div class="footer">
					&copy; 2025 <a href="https://www.CapitaliseGfx.com/">CapitaliseGfx</a>. All rights
					reserved.<br />
					Always verify you're on our official website before entering any
					credentials.
				</div>
			</div>
		</body>
	</html>
	`;
}
