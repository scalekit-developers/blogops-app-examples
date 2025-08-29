import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import passwordlessRouter from './routes/passwordless.js';

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.APP_BASE_URL, credentials: true }));
// Lightweight request logger (morgan already logs summary). Adds body keys for auth endpoints.
app.use((req, _res, next) => {
	if (req.path.startsWith('/api/auth/passwordless')) {
		console.debug(`[TRACE] ${req.method} ${req.path} bodyKeys=${Object.keys(req.body||{}).join(',')}`);
	}
	next();
});
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth/passwordless', passwordlessRouter);
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on :${port}`));
