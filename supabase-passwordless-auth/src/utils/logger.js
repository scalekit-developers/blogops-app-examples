const morgan = require('morgan');
const env = require('../config/env');

function textFormat(tokens, req, res) {
	const status = Number(tokens.status(req, res));
	const colorized = status >= 500 ? '\x1b[31m'+status+'\x1b[0m' : status >= 400 ? '\x1b[33m'+status+'\x1b[0m' : '\x1b[32m'+status+'\x1b[0m';
	const length = tokens.res(req, res, 'content-length') || 0;
	return [
		colorized,
		tokens.method(req, res),
		tokens.url(req, res),
		tokens['response-time'](req, res) + 'ms',
		length + 'b',
		req.id ? `(reqId=${req.id})` : ''
	].join(' ').trim();
}

function jsonFormat(tokens, req, res) {
	const status = Number(tokens.status(req, res));
	const payload = {
		ts: new Date().toISOString(),
		method: tokens.method(req, res),
		path: tokens.url(req, res),
		status,
		rt_ms: Number(tokens['response-time'](req, res)),
		bytes: Number(tokens.res(req, res, 'content-length') || 0),
		reqId: req.id
	};
	return JSON.stringify(payload);
}

const format = env.LOG_FORMAT === 'json' ? jsonFormat : textFormat;

// Basic log level filter: only log errors if LOG_LEVEL=error
const httpLogger = morgan(format, {
	skip: (req, res) => {
		if (req.path === '/favicon.ico') return true;
		if (env.LOG_LEVEL === 'error') {
			const status = res.statusCode;
			return status < 400; // suppress non-errors
		}
		return false;
	}
});

module.exports = { httpLogger };
