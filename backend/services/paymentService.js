import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

class PaymentService {
  constructor() {
    try {
      const key_id = process.env.RAZORPAY_KEY_ID;
      const key_secret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!key_id || !key_secret) {
        console.error('Razorpay credentials not found in environment variables');
        throw new Error('Razorpay credentials not found in environment variables');
      }
      
      this.razorpay = new Razorpay({
        key_id,
        key_secret,
      });
      
      console.log('Razorpay initialized successfully with key_id:', key_id);
    } catch (error) {
      console.error('Failed to initialize Razorpay:', error);
      // We'll initialize without throwing to allow the application to start
      // but payment operations will fail
    }
  }

  async createOrder(amount, currency = 'INR') {
    try {
      if (!this.razorpay) {
        console.error('Razorpay initialization error: Instance not found');
        throw new Error('Payment service is not properly initialized');
      }

      if (!amount || amount <= 0) {
        throw new Error('Invalid amount provided for payment');
      }

      const options = {
        amount: amount * 100, // Razorpay expects amount in paise
        currency,
        receipt: `receipt_${Date.now()}`,
      };

      const order = await this.razorpay.orders.create(options);
      console.log('Razorpay order created successfully:', order.id);
      return order;
    } catch (error) {
      console.error('Razorpay API Error:', error);
      throw new Error(error.error?.description || 'Failed to create payment order');
    }
  }

  verifyPayment(razorpayOrderId, razorpayPaymentId, signature) {
    try {
      if (!this.razorpay) {
        console.error('Razorpay is not initialized for signature verification');
        throw new Error('Razorpay is not initialized. Please check your credentials.');
      }

      if (!razorpayOrderId || !razorpayPaymentId || !signature) {
        console.error('Missing verification parameters:', { 
          hasOrderId: !!razorpayOrderId, 
          hasPaymentId: !!razorpayPaymentId, 
          hasSignature: !!signature 
        });
        throw new Error('Missing required payment verification parameters');
      }

      const key_secret = process.env.RAZORPAY_KEY_SECRET;
      if (!key_secret) {
        console.error('Razorpay secret key is missing for signature verification');
        throw new Error('Razorpay secret key is not configured');
      }

      // Generate the expected signature
      const text = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(text)
        .digest('hex');

      console.log('Signature verification details:', {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        receivedSignatureLength: signature.length,
        expectedSignatureLength: expectedSignature.length,
        receivedSignaturePrefix: signature.substring(0, 10) + '...',
        expectedSignaturePrefix: expectedSignature.substring(0, 10) + '...'
      });

      // Simple string comparison - most reliable method
      const isValid = expectedSignature === signature;
      
      if (!isValid) {
        console.error('Signature verification failed - signatures do not match');
        return false;
      }

      console.log('Payment signature verified successfully');
      return true;
    } catch (error) {
      console.error('Error in payment signature verification:', error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }
  
  // Helper method to check if Razorpay is properly initialized
  isInitialized() {
    return !!this.razorpay;
  }
}

export default new PaymentService();