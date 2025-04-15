/**
 * Email Service
 * 
 * Handles sending emails for various purposes including notifications
 */
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { logError, logInfo } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendEmail(to, subject, html) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      logInfo('Email sent successfully:', { messageId: info.messageId });
      return info;
    } catch (error) {
      logError('Error sending email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Virtual Trading Simulator';
    const html = `
      <h1>Welcome to Virtual Trading Simulator!</h1>
      <p>Dear ${user.name},</p>
      <p>Thank you for joining Virtual Trading Simulator. We're excited to help you learn and practice trading in a risk-free environment.</p>
      <p>Here are some quick links to get you started:</p>
      <ul>
        <li><a href="${process.env.FRONTEND_URL}/learn">Learning Center</a></li>
        <li><a href="${process.env.FRONTEND_URL}/market">Market Data</a></li>
        <li><a href="${process.env.FRONTEND_URL}/portfolio">Your Portfolio</a></li>
      </ul>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Happy Trading!</p>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const subject = 'Password Reset Request';
    const html = `
      <h1>Password Reset Request</h1>
      <p>Dear ${user.name},</p>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendOrderConfirmation(user, order) {
    const subject = 'Order Confirmation';
    const html = `
      <h1>Order Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>Your order has been successfully ${order.status}.</p>
      <p>Order Details:</p>
      <ul>
        <li>Order ID: ${order.id}</li>
        <li>Symbol: ${order.symbol}</li>
        <li>Type: ${order.type}</li>
        <li>Quantity: ${order.quantity}</li>
        <li>Price: ${order.price}</li>
        <li>Total: ${order.total}</li>
      </ul>
      <p>View your <a href="${process.env.FRONTEND_URL}/portfolio">portfolio</a> for more details.</p>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendAlertNotification(user, alert) {
    const subject = 'Price Alert Notification';
    const html = `
      <h1>Price Alert Triggered</h1>
      <p>Dear ${user.name},</p>
      <p>Your price alert for ${alert.symbol} has been triggered.</p>
      <p>Alert Details:</p>
      <ul>
        <li>Symbol: ${alert.symbol}</li>
        <li>Condition: ${alert.condition}</li>
        <li>Target Price: ${alert.targetPrice}</li>
        <li>Current Price: ${alert.currentPrice}</li>
      </ul>
      <p>View the stock on our <a href="${process.env.FRONTEND_URL}/market/${alert.symbol}">platform</a>.</p>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendSubscriptionConfirmation(user, subscription) {
    const subject = 'Subscription Confirmation';
    const html = `
      <h1>Subscription Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>Thank you for subscribing to our ${subscription.plan} plan.</p>
      <p>Subscription Details:</p>
      <ul>
        <li>Plan: ${subscription.plan}</li>
        <li>Duration: ${subscription.duration}</li>
        <li>Amount: ${subscription.amount}</li>
        <li>Start Date: ${subscription.startDate}</li>
        <li>End Date: ${subscription.endDate}</li>
      </ul>
      <p>Enjoy the enhanced features of your subscription!</p>
    `;

    return this.sendEmail(user.email, subject, html);
  }
}

export default new EmailService(); 