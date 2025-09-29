interface WithdrawApprovalParams {
	name: string;
	amount: number | string;
	txId: string;
	walletAddress: string;
}

export const withdrawApprovalTemplate = ({
	name,
	amount,
	txId,
	walletAddress,
}: WithdrawApprovalParams): string => {
	return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Withdrawal Approved - H5Fivex</title>
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
          margin: 30px auto;
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
          color: #38a169;
        }
        .transaction-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          border-left: 4px solid #6b46c1;
        }
        .transaction-item {
          margin-bottom: 15px;
          display: flex;
          align-items: flex-start;
        }
        .transaction-item:last-child {
          margin-bottom: 0;
        }
        .transaction-icon {
          margin-right: 12px;
          font-size: 18px;
          color: #6b46c1;
          min-width: 24px;
        }
        .transaction-label {
          font-weight: 500;
          color: #4a5568;
          margin-bottom: 5px;
        }
        .transaction-value {
          font-weight: 400;
          word-break: break-word;
        }
        .tx-id {
          background: #edf2f7;
          padding: 8px 12px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 14px;
          margin-top: 5px;
          display: inline-block;
          word-break: break-all;
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
          <h1 class="logo"><span>H5</span>Fivex</h1>
        </div>

        <div class="content">
          <h2 class="title"><span class="icon">✓</span> Withdrawal Approved</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            Your withdrawal request has been successfully processed and the funds
            have been sent to your wallet.
          </p>

          <div class="transaction-card">
            <div class="transaction-item">
              <div class="transaction-icon">💸</div>
              <div>
                <div class="transaction-label">Amount Withdrawn</div>
                <div class="transaction-value">${amount} USDT</div>
              </div>
            </div>

            <div class="transaction-item">
              <div class="transaction-icon">📍</div>
              <div>
                <div class="transaction-label">Destination Wallet</div>
                <div class="transaction-value">${walletAddress}</div>
              </div>
            </div>

            <div class="transaction-item">
              <div class="transaction-icon">🔗</div>
              <div>
                <div class="transaction-label">Transaction ID</div>
                <div class="transaction-value">
                  <div class="tx-id">${txId}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="security-note">
            <strong>Important:</strong> The transaction may take some time to
            appear in your wallet depending on network congestion. If you didn't
            initiate this withdrawal, please secure your account immediately.
          </div>

          <p>
            Thank you for using H5Fivex. We're committed to providing you with
            secure and efficient digital asset services.
          </p>
        </div>

        <div class="footer">
          <div>
            &copy; 2025 <a href="https://www.h5fivex.com/">H5Fivex</a>. All rights
            reserved.
          </div>
        </div>
      </div>
    </body>
  </html>`;
};
