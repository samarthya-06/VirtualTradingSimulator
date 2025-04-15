import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define the Module schema (simplified for lookup)
const moduleSchema = new mongoose.Schema({}, { strict: false });
const Module = mongoose.model('Module', moduleSchema);

// Define the Lesson schema
const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    content: {
      type: String,
      required: [true, 'Please add content'],
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    duration: {
      type: Number, // in minutes
      required: true,
      default: 10,
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    resources: [
      {
        title: String,
        url: String,
        type: {
          type: String,
          enum: ['article', 'video', 'pdf', 'link'],
          default: 'link',
        },
      },
    ],
    quiz: [
      {
        question: String,
        options: [String],
        correctAnswer: Number, // Index of the correct option
        explanation: String,
      },
    ],
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create the Lesson model
const Lesson = mongoose.model('Lesson', lessonSchema);

// Function to seed lessons for each module
async function seedLessons() {
  try {
    // Delete existing lessons
    await Lesson.deleteMany({});
    console.log('Deleted existing lessons');

    // Get all modules
    const modules = await Module.find();
    console.log(`Found ${modules.length} modules`);

    if (modules.length === 0) {
      console.log('No modules found. Please run seedLearningModules.js first.');
      mongoose.disconnect();
      return;
    }

    // Create a map of module categories to their IDs
    const moduleMap = {};
    modules.forEach(module => {
      moduleMap[module.title] = module._id;
    });

    // Sample lessons for each module
    const sampleLessons = [
      // Introduction to Stock Trading lessons
      {
        title: 'What is Stock Trading?',
        description: 'Learn the basic concepts of stock trading and how the stock market works.',
        content: `<h2>Introduction to Stock Trading</h2>
<p>Stock trading is the buying and selling of shares in publicly traded companies on stock exchanges. When you buy a stock, you're purchasing a small ownership stake in a company.</p>
<h3>Key Concepts</h3>
<ul>
<li><strong>Stocks/Shares</strong>: Represent ownership in a company</li>
<li><strong>Stock Exchange</strong>: A marketplace where stocks are traded</li>
<li><strong>Bull Market</strong>: A market characterized by rising prices</li>
<li><strong>Bear Market</strong>: A market characterized by falling prices</li>
</ul>
<p>When you're ready to start trading, you'll need to open a brokerage account, deposit funds, and then you can begin buying and selling stocks.</p>`,
        moduleId: moduleMap['Introduction to Stock Trading'],
        order: 1,
        duration: 15,
        difficulty: 'beginner',
        resources: [
          {
            title: 'How the Stock Market Works',
            url: 'https://www.investopedia.com/articles/investing/082614/how-stock-market-works.asp',
            type: 'article'
          }
        ],
        quiz: [
          {
            question: 'What does owning a stock represent?',
            options: ['A loan to a company', 'Ownership in a company', 'A promise to buy company products', 'A job at the company'],
            correctAnswer: 1,
            explanation: 'When you own a stock, you own a small piece of that company.'
          }
        ],
        isPublished: true
      },
      {
        title: 'Understanding Stock Exchanges',
        description: 'Learn about different stock exchanges and how they operate.',
        content: `<h2>Stock Exchanges Around the World</h2>
<p>Stock exchanges are organized marketplaces where stocks, bonds, and other securities are traded. The major stock exchanges include:</p>
<ul>
<li><strong>New York Stock Exchange (NYSE)</strong>: The largest stock exchange in the world by market capitalization</li>
<li><strong>NASDAQ</strong>: Known for technology stocks and electronic trading</li>
<li><strong>London Stock Exchange (LSE)</strong>: One of the oldest stock exchanges</li>
<li><strong>Tokyo Stock Exchange (TSE)</strong>: Japan's largest stock exchange</li>
<li><strong>National Stock Exchange of India (NSE)</strong>: India's leading stock exchange</li>
</ul>
<p>Each exchange has its own listing requirements, trading hours, and indices that track the performance of stocks listed on that exchange.</p>`,
        moduleId: moduleMap['Introduction to Stock Trading'],
        order: 2,
        duration: 12,
        difficulty: 'beginner',
        isPublished: true
      },
      
      // Technical Analysis Fundamentals lessons
      {
        title: 'Chart Patterns and Indicators',
        description: 'Learn to identify common chart patterns and use technical indicators.',
        content: `<h2>Chart Patterns and Technical Indicators</h2>
<p>Technical analysis uses historical price and volume data to predict future price movements. Two key components are chart patterns and indicators.</p>
<h3>Common Chart Patterns</h3>
<ul>
<li><strong>Head and Shoulders</strong>: A reversal pattern indicating a trend change</li>
<li><strong>Double Top/Bottom</strong>: Reversal patterns showing resistance/support levels</li>
<li><strong>Triangle Patterns</strong>: Continuation patterns showing consolidation</li>
</ul>
<h3>Popular Technical Indicators</h3>
<ul>
<li><strong>Moving Averages</strong>: Show the average price over a specific time period</li>
<li><strong>Relative Strength Index (RSI)</strong>: Measures the speed and change of price movements</li>
<li><strong>MACD</strong>: Shows the relationship between two moving averages</li>
</ul>`,
        moduleId: moduleMap['Technical Analysis Fundamentals'],
        order: 1,
        duration: 20,
        difficulty: 'intermediate',
        isPublished: true
      },
      {
        title: 'Candlestick Patterns',
        description: 'Master the art of reading candlestick patterns for market analysis.',
        content: `<h2>Understanding Candlestick Patterns</h2>
<p>Candlestick charts originated in Japan and provide more information than traditional line charts. Each candlestick shows the open, high, low, and close prices for a specific time period.</p>
<h3>Basic Candlestick Components</h3>
<ul>
<li><strong>Body</strong>: The rectangular area between the open and close prices</li>
<li><strong>Wick/Shadow</strong>: The thin lines above and below the body showing the high and low prices</li>
<li><strong>Bullish Candle</strong>: Usually green or white, where the close is higher than the open</li>
<li><strong>Bearish Candle</strong>: Usually red or black, where the close is lower than the open</li>
</ul>
<h3>Important Candlestick Patterns</h3>
<ul>
<li><strong>Doji</strong>: Shows indecision when open and close prices are nearly equal</li>
<li><strong>Hammer</strong>: Potential reversal pattern at the bottom of a downtrend</li>
<li><strong>Engulfing Pattern</strong>: When a candle completely engulfs the previous candle</li>
</ul>`,
        moduleId: moduleMap['Technical Analysis Fundamentals'],
        order: 2,
        duration: 15,
        difficulty: 'intermediate',
        isPublished: true
      },
      
      // Fundamental Analysis lessons
      {
        title: 'Financial Statement Analysis',
        description: 'Learn how to analyze company financial statements to make investment decisions.',
        content: `<h2>Financial Statement Analysis</h2>
<p>Fundamental analysis involves evaluating a company's financial health through its financial statements. The three main financial statements are:</p>
<h3>1. Income Statement</h3>
<p>Shows a company's revenues, expenses, and profits over a specific period. Key metrics include:</p>
<ul>
<li><strong>Revenue</strong>: Total money earned from sales</li>
<li><strong>Gross Profit</strong>: Revenue minus cost of goods sold</li>
<li><strong>Net Income</strong>: The bottom line after all expenses</li>
<li><strong>Earnings Per Share (EPS)</strong>: Net income divided by outstanding shares</li>
</ul>
<h3>2. Balance Sheet</h3>
<p>Shows a company's assets, liabilities, and shareholders' equity at a specific point in time. Key components:</p>
<ul>
<li><strong>Assets</strong>: What the company owns</li>
<li><strong>Liabilities</strong>: What the company owes</li>
<li><strong>Shareholders' Equity</strong>: Assets minus liabilities</li>
</ul>
<h3>3. Cash Flow Statement</h3>
<p>Shows how cash moves in and out of the business. Sections include:</p>
<ul>
<li><strong>Operating Activities</strong>: Cash from core business operations</li>
<li><strong>Investing Activities</strong>: Cash used for investments</li>
<li><strong>Financing Activities</strong>: Cash from loans, stock issuance, etc.</li>
</ul>`,
        moduleId: moduleMap['Fundamental Analysis'],
        order: 1,
        duration: 25,
        difficulty: 'intermediate',
        isPublished: true
      },
      
      // Risk Management Strategies lessons
      {
        title: 'Position Sizing and Stop-Loss Strategies',
        description: 'Learn effective position sizing techniques and how to set stop-loss orders.',
        content: `<h2>Position Sizing and Stop-Loss Strategies</h2>
<p>Proper risk management is crucial for long-term trading success. Two key components are position sizing and stop-loss orders.</p>
<h3>Position Sizing</h3>
<p>Position sizing determines how much of your capital to risk on each trade. Common methods include:</p>
<ul>
<li><strong>Fixed Dollar Amount</strong>: Risking the same amount on each trade</li>
<li><strong>Percentage of Portfolio</strong>: Risking a fixed percentage (typically 1-2%) of your total portfolio on each trade</li>
<li><strong>Volatility-Based Sizing</strong>: Adjusting position size based on a stock's volatility</li>
</ul>
<h3>Stop-Loss Orders</h3>
<p>A stop-loss order automatically sells a stock when it reaches a predetermined price, limiting your potential loss. Types include:</p>
<ul>
<li><strong>Fixed Stop-Loss</strong>: Set at a specific price level</li>
<li><strong>Percentage Stop-Loss</strong>: Set at a percentage below your entry price</li>
<li><strong>Trailing Stop-Loss</strong>: Adjusts upward as the stock price increases</li>
<li><strong>Volatility Stop-Loss</strong>: Based on a stock's average true range (ATR)</li>
</ul>
<p>Remember: The key to successful risk management is consistency and discipline in applying these techniques.</p>`,
        moduleId: moduleMap['Risk Management Strategies'],
        order: 1,
        duration: 18,
        difficulty: 'beginner',
        isPublished: true
      },
      
      // Advanced Trading Strategies lessons
      {
        title: 'Swing Trading Techniques',
        description: 'Master the art of swing trading to capture medium-term market moves.',
        content: `<h2>Swing Trading Techniques</h2>
<p>Swing trading aims to capture gains from price movements over a period of days to weeks. It's a middle ground between day trading and long-term investing.</p>
<h3>Key Swing Trading Principles</h3>
<ul>
<li><strong>Trend Identification</strong>: Trading in the direction of the overall trend</li>
<li><strong>Support and Resistance</strong>: Entering trades at key price levels</li>
<li><strong>Momentum Indicators</strong>: Using RSI, MACD, and stochastics to time entries and exits</li>
<li><strong>Risk Management</strong>: Setting appropriate stop-losses and take-profit levels</li>
</ul>
<h3>Swing Trading Strategies</h3>
<ul>
<li><strong>Pullback Trading</strong>: Buying during temporary retracements in an uptrend</li>
<li><strong>Breakout Trading</strong>: Entering when price breaks through significant levels</li>
<li><strong>Range Trading</strong>: Buying at support and selling at resistance in sideways markets</li>
</ul>
<p>Successful swing trading requires patience, discipline, and the ability to identify high-probability setups while managing risk effectively.</p>`,
        moduleId: moduleMap['Advanced Trading Strategies'],
        order: 1,
        duration: 22,
        difficulty: 'advanced',
        isPublished: true
      }
    ];

    // Insert sample lessons
    const createdLessons = await Lesson.insertMany(sampleLessons);
    console.log(`Created ${createdLessons.length} sample lessons:`);
    createdLessons.forEach(lesson => {
      console.log(`- ${lesson.title} (Module: ${lesson.moduleId})`);
    });

    // Update module totalLessons count
    for (const moduleId of Object.values(moduleMap)) {
      const lessonCount = await Lesson.countDocuments({ moduleId });
      await Module.findByIdAndUpdate(moduleId, { totalLessons: lessonCount });
    }

    console.log('Updated module lesson counts');

    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error seeding lessons:', error);
    mongoose.disconnect();
  }
}

// Run the seed function
seedLessons();