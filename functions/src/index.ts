/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import twilio from 'twilio'; // Changed from: import * as twilio from 'twilio';

admin.initializeApp();

// Email transporter setup (using Gmail as example, but you can use SendGrid, Mailgun, etc.)
const createEmailTransporter = () => {
  // Development mode: Just log emails instead of sending
  if (process.env.NODE_ENV === 'development' || process.env.FUNCTIONS_EMULATOR === 'true') {
    return {
      sendMail: async (options: any) => {
        console.log('📧 [EMULATOR MODE] Email would be sent:');
        console.log('   To:', options.to);
        console.log('   Subject:', options.subject);
        console.log('   Body:', options.html || options.text);
        return { messageId: 'emulator-' + Date.now() };
      }
    } as any;
  }

  // Option 1: Gmail (for development/testing)
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS, // Use App Password for Gmail
      },
    });
  }

  // Option 2: SendGrid (recommended for production)
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  // Option 3: Mailgun
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    return nodemailer.createTransport({
      host: `smtp.mailgun.org`,
      port: 587,
      auth: {
        user: `postmaster@${process.env.MAILGUN_DOMAIN}`,
        pass: process.env.MAILGUN_API_KEY,
      },
    });
  }

  // If no email service configured, use mock for development
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ No email service configured. Using mock email sender for development.');
    return {
      sendMail: async (options: any) => {
        console.log('📧 [MOCK MODE] Email would be sent:');
        console.log('   To:', options.to);
        console.log('   Subject:', options.subject);
        console.log('   Body:', options.html || options.text);
        return { messageId: 'mock-' + Date.now() };
      }
    } as any;
  }

  throw new Error('No email service configured');
};

// Twilio client setup
const getTwilioClient = () => {
  // Development mode: Mock SMS
  if (process.env.NODE_ENV === 'development' || process.env.FUNCTIONS_EMULATOR === 'true') {
    return {
      messages: {
        create: async (options: any) => {
          console.log('📱 [EMULATOR MODE] SMS would be sent:');
          console.log('   To:', options.to);
          console.log('   From:', options.from);
          console.log('   Message:', options.body);
          return { sid: 'emulator-' + Date.now() };
        }
      }
    } as any;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    // In development, return mock instead of throwing
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Twilio not configured. Using mock SMS sender for development.');
      return {
        messages: {
          create: async (options: any) => {
            console.log('📱 [MOCK MODE] SMS would be sent:');
            console.log('   To:', options.to);
            console.log('   Message:', options.body);
            return { sid: 'mock-' + Date.now() };
          }
        }
      } as any;
    }
    throw new Error('Twilio credentials not configured');
  }

  return twilio(accountSid, authToken);
};

// Main notification function
export const sendNotification = functions.https.onCall(async (data, context) => {
  try {
    const { type, to, subject, body, message } = data; // Removed unused notificationType

    if (type === 'email') {
      if (!to || !subject || !body) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Email requires: to, subject, and body'
        );
      }

      const transporter = createEmailTransporter();
      const fromEmail = process.env.FROM_EMAIL || 'noreply@childcareapp.com';

      await transporter.sendMail({
        from: fromEmail,
        to: to,
        subject: subject,
        html: body, // Use HTML for better formatting
        text: body.replace(/<[^>]*>/g, ''), // Plain text version
      });

      return { success: true, message: 'Email sent successfully' };
    }

    if (type === 'sms') {
      if (!to || !message) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'SMS requires: to and message'
        );
      }

      const client = getTwilioClient();
      const isEmulatorMode = process.env.NODE_ENV === 'development' || process.env.FUNCTIONS_EMULATOR === 'true';
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

      // Only require phone number in production mode
      if (!isEmulatorMode && !twilioPhoneNumber) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Twilio phone number not configured'
        );
      }

      // Use a mock phone number in emulator mode, or the configured one in production
      const fromNumber = isEmulatorMode ? '+1234567890' : twilioPhoneNumber;

      const result = await client.messages.create({
        body: message,
        from: fromNumber!,
        to: to,
      });

      return { success: true, messageId: result.sid };
    }

    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid notification type. Use "email" or "sms"'
    );
  } catch (error: any) {
    console.error('Notification error:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to send notification'
    );
  }
});

// Reminder function (for scheduled reminders)
export const sendReminder = functions.https.onCall(async (data, context) => {
  // Similar implementation for reminders
  // Can be extended to send reminders before date nights
  return { success: true };
});

// Process recurring dates (can be a scheduled function)
export const processRecurringDates = functions.https.onCall(async (data, context) => {
  // Implementation for creating recurring date nights
  return { success: true };
});
