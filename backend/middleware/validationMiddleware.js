import { body, param, query, validationResult } from 'express-validator';

/**
 * User-related validation rules
 */
export const userValidationRules = {
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .isEmail().withMessage('Please include a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
      .matches(/\d/).withMessage('Password must contain a number')
  ],
  login: [
    body('email')
      .isEmail().withMessage('Please include a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .optional()
      .isEmail().withMessage('Please include a valid email')
      .normalizeEmail(),
    body('password')
      .optional()
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
      .matches(/\d/).withMessage('Password must contain a number')
  ]
};

/**
 * Trade-related validation rules
 */
export const tradeValidationRules = {
  placeTrade: [
    body('symbol')
      .trim()
      .notEmpty().withMessage('Stock symbol is required')
      .isLength({ min: 1, max: 10 }).withMessage('Symbol must be between 1 and 10 characters'),
    body('quantity')
      .isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('type')
      .custom(value => {
        const upperValue = value.toUpperCase();
        return ['BUY', 'SELL'].includes(upperValue);
      }).withMessage('Trade type must be buy or sell'),
    body('orderType')
      .custom(value => {
        const upperValue = value.toUpperCase();
        return ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 'TRAILING_STOP'].includes(upperValue);
      }).withMessage('Order type must be valid'),
    body('limitPrice')
      .optional()
      .isFloat({ min: 0.01 }).withMessage('Limit price must be a positive number')
      .custom((value, { req }) => {
        const orderType = req.body.orderType?.toUpperCase();
        if ((orderType === 'LIMIT' || orderType === 'STOP_LIMIT') && !value) {
          throw new Error('Limit price is required for limit orders');
        }
        return true;
      }),
    body('stopPrice')
      .optional()
      .isFloat({ min: 0.01 }).withMessage('Stop price must be a positive number')
      .custom((value, { req }) => {
        const orderType = req.body.orderType?.toUpperCase();
        if ((orderType === 'STOP' || orderType === 'STOP_LIMIT') && !value) {
          throw new Error('Stop price is required for stop orders');
        }
        return true;
      }),
    body('trailingPercent')
      .optional()
      .isFloat({ min: 0.1, max: 20 }).withMessage('Trailing percent must be between 0.1 and 20')
      .custom((value, { req }) => {
        const orderType = req.body.orderType?.toUpperCase();
        if (orderType === 'TRAILING_STOP' && !value) {
          throw new Error('Trailing percent is required for trailing stop orders');
        }
        return true;
      }),
    body('timeInForce')
      .optional()
      .custom(value => {
        const upperValue = value.toUpperCase();
        return ['DAY', 'GTC', 'IOC', 'FOK'].includes(upperValue);
      }).withMessage('Time in force must be valid'),
    body('isPartialFillAllowed')
      .optional()
      .isBoolean().withMessage('isPartialFillAllowed must be a boolean')
  ],
  getTradeHistory: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .custom(value => {
        return ['PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'PARTIALLY_FILLED', 'REJECTED'].includes(value);
      }).withMessage('Status must be valid')
  ],
  processPartialFill: [
    body('fillQuantity')
      .isInt({ min: 1 }).withMessage('Fill quantity must be a positive integer'),
    body('fillPrice')
      .isFloat({ min: 0.01 }).withMessage('Fill price must be a positive number')
  ]
};

/**
 * Wallet-related validation rules
 */
export const walletValidationRules = {
  addFunds: [
    body('amount')
      .isFloat({ min: 10 }).withMessage('Amount must be at least 10')
  ],
  withdrawFunds: [
    body('amount')
      .isFloat({ min: 10 }).withMessage('Amount must be at least 10')
  ]
};

/**
 * Watchlist-related validation rules
 */
export const watchlistValidationRules = {
  addStock: [
    body('symbol')
      .trim()
      .notEmpty().withMessage('Stock symbol is required')
      .isLength({ min: 1, max: 10 }).withMessage('Symbol must be between 1 and 10 characters')
  ]
};

/**
 * Stock-related validation rules
 */
export const stockValidationRules = {
  getStockDetails: [
    param('symbol')
      .trim()
      .notEmpty().withMessage('Stock symbol is required')
      .isLength({ min: 1, max: 10 }).withMessage('Symbol must be between 1 and 10 characters')
  ],
  searchStocks: [
    query('query')
      .trim()
      .notEmpty().withMessage('Search query is required')
      .isLength({ min: 1, max: 50 }).withMessage('Search query must be between 1 and 50 characters')
  ]
};

/**
 * Payment-related validation rules
 */
export const paymentValidationRules = {
  createOrder: [
    body('amount')
      .isFloat({ min: 10 }).withMessage('Amount must be at least 10')
  ],
  verifyPayment: [
    body('razorpay_order_id')
      .notEmpty().withMessage('Order ID is required'),
    body('razorpay_payment_id')
      .notEmpty().withMessage('Payment ID is required'),
    body('razorpay_signature')
      .notEmpty().withMessage('Signature is required')
  ]
};

/**
 * Validation middleware
 * Checks for validation errors and returns appropriate response
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      }
    });
  }
  next();
}; 