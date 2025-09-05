const env = require('./config/env');
const app = require('./app');

// Process-level safety nets for cleaner logs instead of crashing with raw stack
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason && reason.message ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message);
});

const port = env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port} (env: ${env.NODE_ENV})`);
  console.log(`Swagger UI: http://localhost:${port}/docs`);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return; // prevent double invocation
  shuttingDown = true;
  console.log(`\n[shutdown] Received ${signal}. Closing server...`);
  // Stop accepting new connections
  server.close(err => {
    if (err) {
      console.error('[shutdown] Error during close', err.message);
      process.exitCode = 1;
    }
    // Give a short grace for any ongoing async work (sessions writes etc.)
    setTimeout(() => {
      console.log('[shutdown] Exit complete');
      process.exit();
    }, 100);
  });
  // Fallback hard exit if something hangs
  setTimeout(() => {
    console.warn('[shutdown] Force exiting after timeout');
    process.exit(1);
  }, 5000).unref();
}

// On Windows, SIGINT is delivered but sometimes nodemon kill → EPERM if process lingers.
['SIGINT', 'SIGTERM'].forEach(sig => {
  try { process.on(sig, () => shutdown(sig)); } catch (_) { /* some signals not supported */ }
});

// Nodemon sends SIGUSR2 on restart; handle gracefully then re-emit to allow restart
process.once('SIGUSR2', () => {
  shutdown('SIGUSR2');
  // re-send after close so nodemon can restart cleanly
  setTimeout(() => process.kill(process.pid, 'SIGUSR2'), 500);
});
