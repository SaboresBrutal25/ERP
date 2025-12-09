import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { port, moduleConfigs } from './config.js';
import authRoutes from './routes/auth.js';
import { createModuleRouter } from './routes/moduleFactory.js';

const app = express();

// CORS: permitir orígenes locales por defecto (refleja cualquier origin)
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.CLIENT_ORIGIN) {
      const list = process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim());
      return callback(null, list.includes(origin));
    }
    return callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);

Object.entries(moduleConfigs).forEach(([name, cfg]) => {
  app.use(`/api/${name}`, createModuleRouter(cfg, name));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno' });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
