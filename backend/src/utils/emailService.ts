import Mailgun from 'mailgun.js';
import FormData from 'form-data';

const mailgun = new Mailgun(FormData);

// Initialize Mailgun client
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
});

const DOMAIN = process.env.MAILGUN_DOMAIN || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourdomain.com';

export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  verificationToken: string
) => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const emailData = {
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 10px;
              border: 1px solid #ddd;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #2c3e50;
              margin: 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 8px;
              text-align: center;
            }
            .btn {
              display: inline-block;
              background-color: #3498db;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .btn:hover {
              background-color: #2980b9;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 14px;
              color: #666;
            }
            .warning {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Our Store!</h1>
            </div>
            
            <div class="content">
              <h2>Hi ${firstName}!</h2>
              <p>Thank you for creating an account with us. To complete your registration and start shopping, please verify your email address by clicking the button below:</p>
              
              <a href="${verificationUrl}" class="btn">Verify Email Address</a>
              
              <div class="warning">
                <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3498db;">${verificationUrl}</p>
              
              <p>If you didn't create an account with us, please ignore this email.</p>
            </div>
            
            <div class="footer">
              <p>© 2025 Our Store. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${firstName}!
        
        Thank you for creating an account with us. To complete your registration, please verify your email address by clicking the link below:
        
        ${verificationUrl}
        
        This verification link will expire in 24 hours for security reasons.
        
        If you didn't create an account with us, please ignore this email.
        
        © 2025 Our Store. All rights reserved.
      `
    };

    const response = await mg.messages.create(DOMAIN, emailData);
    console.log('Verification email sent successfully:', response);
    return response;

  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

export const sendWelcomeEmail = async (email: string, firstName: string) => {
  try {
    const emailData = {
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to Our Store!',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 10px;
              border: 1px solid #ddd;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #27ae60;
              margin: 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 8px;
              text-align: center;
            }
            .btn {
              display: inline-block;
              background-color: #27ae60;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Our Store!</h1>
            </div>
            
            <div class="content">
              <h2>Hi ${firstName}!</h2>
              <p>Your email has been successfully verified and your account is now active!</p>
              <p>You can now enjoy all the features of our store:</p>
              <ul style="text-align: left; max-width: 300px; margin: 20px auto;">
                <li>Browse our extensive product catalog</li>
                <li>Add items to your cart</li>
                <li>Track your orders</li>
                <li>Leave reviews and ratings</li>
                <li>Manage your profile and addresses</li>
              </ul>
              
              <a href="${process.env.FRONTEND_URL}/products" class="btn">Start Shopping</a>
            </div>
            
            <div class="footer">
              <p>© 2025 Our Store. All rights reserved.</p>
              <p>Happy shopping!</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${firstName}!
        
        Your email has been successfully verified and your account is now active!
        
        You can now enjoy all the features of our store:
        - Browse our extensive product catalog
        - Add items to your cart
        - Track your orders
        - Leave reviews and ratings
        - Manage your profile and addresses
        
        Visit ${process.env.FRONTEND_URL}/products to start shopping!
        
        © 2025 Our Store. All rights reserved.
        Happy shopping!
      `
    };

    const response = await mg.messages.create(DOMAIN, emailData);
    console.log('Welcome email sent successfully:', response);
    return response;

  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new Error('Failed to send welcome email');
  }
};
