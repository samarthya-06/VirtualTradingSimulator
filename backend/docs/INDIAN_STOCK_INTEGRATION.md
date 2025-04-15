# Indian Stock Market Data Integration

This document explains how the Indian stock market (NSE/BSE) data integration works in our system.

## Overview

The system integrates real-time data for Indian stock markets (NSE and BSE) using Yahoo Finance as the primary data provider. The integration includes:

1. Real-time stock quote updates (1-second intervals)
2. Stock search functionality
3. Market indices tracking
4. Symbol standardization utilities
5. Fallback mechanisms when the API fails

## Key Files

- `backend/utils/indianStockUtils.js` - Utility functions and data structures for Indian markets
- `backend/services/stockMarketService.js` - Main service for fetching and processing stock data
- `backend/services/webSocketService.js` - Real-time data streaming via WebSockets
- `backend/services/marketDataCacheService.js` - Caching layer for market data

## Symbol Handling

One of the challenges with Indian stock data is consistent symbol handling. The system supports multiple formats:

- Base symbols (e.g., `RELIANCE`)
- NSE symbols (e.g., `RELIANCE.NS`)
- BSE symbols (e.g., `RELIANCE.BO`)
- Numeric IDs (e.g., `0` for RELIANCE, `1` for TCS, etc.)
- Index symbols (e.g., `^NSEI` for Nifty 50)

The `indianStockUtils.js` utility provides standardization functions:

```javascript
// Get the base symbol without exchange suffix
const baseSymbol = indianStockUtils.getBaseSymbol('RELIANCE.NS'); // Returns 'RELIANCE'

// Standardize to NSE format
const nseSymbol = indianStockUtils.standardizeSymbol('RELIANCE', 'NSE'); // Returns 'RELIANCE.NS'

// Standardize to BSE format
const bseSymbol = indianStockUtils.standardizeSymbol('RELIANCE', 'BSE'); // Returns 'RELIANCE.BO'
```

## Real-time Updates

The system maintains a 1-second update interval for actively watched stocks:

1. When a client subscribes to a stock, the WebSocketService starts a timer
2. Every second, the latest data is fetched from Yahoo Finance
3. The data is cached and broadcast to all connected clients
4. If the Yahoo Finance API fails, fallback data is generated

## Fallback Mechanism

To ensure the system remains operational even during API outages, we implemented:

1. A fallback data generator that creates realistic stock data
2. Automatic switching to fallback mode after repeated API failures
3. A backoff mechanism to avoid overwhelming the API during issues
4. Cache persistence to maintain data during brief outages

## Caching Strategy

The caching strategy is optimized for real-time data:

- Quotes are cached for 2 seconds (to avoid excessive API calls)
- Search results are cached for 10 minutes
- Market indices are cached for 1 minute
- Stock lists are cached for 1 hour

Redis is supported for production environments, with an in-memory fallback when Redis is unavailable.

## Testing

Use the test script to validate the integration:

```bash
node backend/scripts/testStockData.js
```

The script tests:
1. Symbol standardization
2. Quote retrieval
3. Market indices
4. Stock search functionality

## Extending the Integration

To add support for additional Indian stocks:

1. Add them to the `TOP_NSE_STOCKS` or `TOP_BSE_STOCKS` arrays in `indianStockUtils.js`
2. Update the `NUMERIC_TO_SYMBOL_MAP` if you want to assign a numeric ID
3. For indices, add them to `NSE_INDICES` or `BSE_INDICES` and to `INDEX_NAMES`

## Performance Considerations

This integration is optimized for:
- Minimizing API calls (using caching and batching)
- Graceful handling of API failures
- Consistent symbol handling across the application
- Real-time data delivery to clients 