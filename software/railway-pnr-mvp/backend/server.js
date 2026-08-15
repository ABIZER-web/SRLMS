require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const pnrRoutes = require('./routes/pnr');
const linenRoutes = require('./routes/linen');
const linenOpsRoutes = require('./routes/linenOps');
const gateRoutes = require('./routes/gates');
const railwayRoutes = require('./routes/railway');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'railway-pnr-tracker' }));

app.use('/api/auth', authRoutes);
app.use('/api/pnr', pnrRoutes);
app.use('/api/linen', linenRoutes);
app.use('/api/linen-ops', linenOpsRoutes);
app.use('/api/gates', gateRoutes);
app.use('/api/railway', railwayRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

const PORT = process.env.PORT || 5050;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[server] failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
