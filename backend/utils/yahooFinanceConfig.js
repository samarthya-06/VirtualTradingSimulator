/**
 * Yahoo Finance Configuration
 * 
 * This file contains configuration settings for Yahoo Finance API calls
 * Optimized for Indian market data
 */
import yahooFinance from 'yahoo-finance2';
import axios from 'axios';

// Configure Yahoo Finance for better performance with Indian markets
export function configureYahooFinance() {
    try {
        // Check if yahooFinance exists
        if (!yahooFinance) {
            console.error('Yahoo Finance library is not available');
            return;
        }

        // Set axios defaults for better performance
        axios.defaults.timeout = 5000; // 5 second timeout
        
        // Simple configuration that should work without errors
        console.log('Configuring Yahoo Finance for Indian markets');
        
        // Using minimal configuration to avoid errors
        if (yahooFinance && typeof yahooFinance.setGlobalConfig === 'function') {
            try {
                const safeConfig = {
                    validation: { 
                        logErrors: false,
                        strict: false 
                    },
                    timeout: 8000
                };
                
                yahooFinance.setGlobalConfig(safeConfig);
                console.log('Basic Yahoo Finance configuration applied');
            } catch (configError) {
                console.error('Error setting Yahoo Finance global config:', configError.message);
                // Proceed without configuration
            }
        } else {
            console.log('Yahoo Finance setGlobalConfig method is not available - using defaults');
        }
    } catch (error) {
        console.error('Error configuring Yahoo Finance:', error);
    }
}

// Generate exchange suffix mapping for Indian markets
export const exchangeSuffixes = {
    NSE: '.NS', // National Stock Exchange of India
    BSE: '.BO', // Bombay Stock Exchange
};

// Define common indices for Indian markets with accurate symbols
export const indianIndices = {
    NIFTY50: '^NSEI',
    SENSEX: '^BSESN',
    BANKNIFTY: '^NSEBANK',
    NIFTYIT: '^CNXIT',
    NIFTYMIDCAP: '^CNXMIDCAP',
    NIFTYBANK: '^NSEBANK',
    NIFTY100: '^CNX100',
    NIFTY200: '^CNX200',
    NIFTYPHARMA: '^CNXPHARMA',
    NIFTYAUTO: '^CNXAUTO',
    NIFTYFMCG: '^CNXFMCG',
    BSE100: '^BSE100',
    BSE200: '^BSE200',
    BSEHEALTH: '^BSEHC',
    BSEIT: '^BSEIT'
};

// Indian market trading hours for validation
export const tradingHours = {
    start: '09:15',
    end: '15:30',
    timezone: 'Asia/Kolkata'
};

export default {
    configureYahooFinance,
    exchangeSuffixes,
    indianIndices,
    tradingHours
}; 