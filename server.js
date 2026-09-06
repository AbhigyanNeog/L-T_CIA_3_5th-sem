const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/db');

// Import routes and middlewares
const apiRoutes = require('./routes/index');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err.name, err.message);
  process.exit(1);
});

// Initialize Express app
const app = express();

const path = require('path');

// Security HTTP headers (configured for static assets & Google Fonts)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// Cross-Origin Resource Sharing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// HTTP request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting to prevent brute-force attacks
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api', limiter);

// Serve static frontend assets from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
app.use('/api/v1', apiRoutes);

// SPA Frontend Fallback (Serves index.html for non-API web routes)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 Route Handler for unmatched API routes
app.use(notFoundHandler);

// Centralized Global Error Handler
app.use(errorHandler);

// Establish database connection and start server
const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(`[Server] Corporate HR & Payroll System running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

// Start application
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[CRITICAL] Unhandled Rejection:', err.name, err.message);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

module.exports = app;
