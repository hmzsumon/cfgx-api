export const depositTemplate = (
	name: string,
	amount: number | string,
	txId: string
): string => {
	return `
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Deposit Confirmed - H5Fivex</title>
		<style>
			@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
			body {
				margin: 0;
				padding: 0;
				background-color: #f5f7fa;
				font-family: 'Poppins', sans-serif;
				color: #1a202c;
				line-height: 1.5;
			}
			.container {
				max-width: 600px;
				margin: 20px auto;
				background: #ffffff;
				border-radius: 12px;
				overflow: hidden;
				box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
			}
			.header {
				background: linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%);
				padding: 40px 25px;
				text-align: center;
				color: white;
				position: relative;
				overflow: hidden;
			}
			.header::before {
				content: '';
				position: absolute;
				top: -50px;
				right: -30px;
				width: 150px;
				height: 150px;
				background: rgba(255, 255, 255, 0.1);
				border-radius: 50%;
			}
			.header::after {
				content: '';
				position: absolute;
				bottom: -80px;
				left: -30px;
				width: 180px;
				height: 180px;
				background: rgba(255, 255, 255, 0.05);
				border-radius: 50%;
			}
			.logo {
				font-size: 32px;
				font-weight: 700;
				margin: 0;
				letter-spacing: 1px;
				position: relative;
				z-index: 2;
				text-transform: uppercase;
			}
			.logo span {
				color: #f9d423;
				position: relative;
			}
			.logo span::after {
				content: '';
				position: absolute;
				bottom: 2px;
				left: 0;
				width: 100%;
				height: 3px;
				background: #f9d423;
				border-radius: 3px;
			}
			.tagline {
				font-size: 14px;
				opacity: 0.9;
				margin-top: 8px;
				position: relative;
				z-index: 2;
				letter-spacing: 0.5px;
			}
			.content {
				padding: 35px 30px;
			}
			.title {
				font-size: 22px;
				font-weight: 600;
				color: #2d3748;
				margin-top: 0;
				margin-bottom: 20px;
				display: flex;
				align-items: center;
				gap: 10px;
			}
			.card {
				background: #f8fafc;
				border-radius: 10px;
				padding: 20px;
				margin: 20px 0;
				border-left: 3px solid #5e35b1;
			}
			.detail-row {
				margin-bottom: 12px;
			}
			.detail-label {
				font-weight: 500;
				color: #4a5568;
				display: block;
				margin-bottom: 3px;
			}
			.detail-value {
				font-weight: 400;
			}
			.tx-id {
				background: #edf2f7;
				padding: 6px 10px;
				border-radius: 5px;
				font-family: monospace;
				word-break: break-word;
				font-size: 13px;
				display: inline-block;
				margin-top: 5px;
			}
			.status {
				display: inline-block;
				padding: 3px 8px;
				background: #38a169;
				color: white;
				border-radius: 4px;
				font-size: 12px;
				font-weight: 500;
			}
			.cta-container {
				text-align: center;
				margin: 25px 0;
			}
			.cta-button {
				display: inline-block;
				background: linear-gradient(135deg, #5e35b1 0%, #3949ab 100%);
				color: white;
				text-decoration: none;
				padding: 10px 25px;
				border-radius: 6px;
				font-weight: 500;
				transition: transform 0.2s;
			}
			.cta-button:hover {
				transform: translateY(-2px);
			}
			.footer {
				background: #f8fafc;
				padding: 15px;
				text-align: center;
				font-size: 12px;
				color: #718096;
				border-top: 1px solid #e2e8f0;
			}
			.auto-note {
				font-size: 12px;
				color: #718096;
				text-align: center;
				margin-top: 25px;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<div class="header">
				<h1 class="logo"><span>h5</span>Fivex</h1>
			</div>

			<div class="content">
				<h2 class="title">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none"
						xmlns="http://www.w3.org/2000/svg">
						<path
							d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
							stroke="#38a169" stroke-width="2" stroke-linecap="round"
							stroke-linejoin="round"/>
					</svg>
					Deposit Successful
				</h2>

				<p>Hello <strong>${name}</strong>,</p>
				<p>
					Your deposit has been processed successfully and is now available in
					your account.
				</p>

				<div class="card">
					<div class="detail-row">
						<span class="detail-label">Amount</span>
						<span class="detail-value">${amount} USDT</span>
					</div>

					<div class="detail-row">
						<span class="detail-label">Network</span>
						<span class="detail-value">TRC20</span>
					</div>

					<div class="detail-row">
						<span class="detail-label">Status</span>
						<span class="detail-value"><span class="status">Completed</span></span>
					</div>

					<div class="detail-row">
						<span class="detail-label">Transaction ID</span>
						<div>
							<span class="tx-id">${txId}</span>
						</div>
					</div>
				</div>

				<div class="cta-container">
					<a href="https://www.h5fivex.com/dashboard" class="cta-button">View Balance</a>
				</div>

				<p class="auto-note">
					This is an automated notification. Please do not reply.
				</p>
			</div>

			<div class="footer">&copy; 2025 H5Fivex. All rights reserved.</div>
		</div>
	</body>
</html>`;
};
