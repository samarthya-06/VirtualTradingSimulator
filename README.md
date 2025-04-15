# Virtual Trading Simulator

A virtual trading simulator for Indian stock markets using real-time data.

## Features

- Real-time stock data from NSE and BSE
- Advanced trading engine with multiple order types
- Portfolio management and analytics
- User authentication and profiles
- Virtual wallet system
- Educational content for learning trading

## Tech Stack

- **Frontend**: React, Material-UI, Redux Toolkit
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Caching**: Redis (optional)
- **Real-time**: Socket.IO
- **Authentication**: JWT

## Prerequisites

- Node.js (v14+)
- MongoDB
- Redis (optional)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/VirtualTradingSimulator.git
   cd VirtualTradingSimulator
   ```

2. Install dependencies:
   ```
   npm install
   cd frontend
   npm install
   cd ..
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   NODE_ENV=development
   PORT=5002
   MONGO_URI=mongodb://localhost:27017/virtualTradingSimulator
   JWT_SECRET=your_jwt_secret
   YAHOO_FINANCE_API_KEY=your_api_key_here
   
   # Redis Configuration (optional)
   REDIS_ENABLED=false
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   
   # Frontend URL
   REACT_APP_API_URL=http://localhost:5002
   ```

## Running the Application

1. Start the development server:
   ```
   npm run dev
   ```
   This will start both the backend server and the frontend client.

2. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5002

## Setting Up Redis (Optional)

Redis is used for caching market data to improve performance. If you want to use Redis:

1. Install Redis on your system:
   - **Mac**: `brew install redis`
   - **Linux**: `sudo apt-get install redis-server`
   - **Windows**: Download from [Redis for Windows](https://github.com/microsoftarchive/redis/releases)

2. Start Redis server:
   - **Mac/Linux**: `redis-server`
   - **Windows**: Run the Redis server executable

3. Update your `.env` file:
   ```
   REDIS_ENABLED=true
   ```

## Creating an Admin User

To create an admin user for accessing admin features:

```
npm run create-admin
```

This will create an admin user with the following credentials:
- Email: admin@example.com
- Password: admin123

## Populating Stock Data

To populate the database with initial stock data:

```
npm run populate-stocks
```

## Available Scripts

- `npm start` - Start the backend server
- `npm run server` - Start the backend server with nodemon
- `npm run client` - Start the frontend client
- `npm run dev` - Start both backend and frontend
- `npm test` - Run tests
- `npm run create-admin` - Create an admin user
- `npm run populate-stocks` - Populate stock data

## Project Structure

```
VirtualTradingSimulator/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   └── server.js
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── redux/
│       ├── services/
│       └── App.js
├── docs/
└── package.json
```

## Documentation

For more detailed documentation, see the `docs/` directory:

- [Phase 1 Implementation](docs/Phase1Implementation.md) - Core functionality enhancement
- [Project Plan](docs/Plan.txt) - Development roadmap

## License

This project is licensed under the ISC License. 