import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.port, () => {
  console.log(`[server] NovaMarket API listening on http://localhost:${env.port}`);
  console.log(`[server] CORS allowed origin: ${env.clientOrigin}`);
});
