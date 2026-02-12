const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const hostRoutes = require('./routes/hostRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const collegeRoutes = require('./routes/collegeRoutes');
const festRoutes = require('./routes/festRoutes');
const scanRoutes = require('./routes/scanRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/host', hostRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/fest', festRoutes);
app.use('/api/scan', scanRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(errorMiddleware);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nexus Host API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});