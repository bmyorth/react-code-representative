import { serve } from '@hono/node-server';

import { createApp } from './app';

const { app, ctx } = await createApp();

serve({ fetch: app.fetch, port: ctx.config.port, hostname: '127.0.0.1' }, (info) => {
  console.warn(`API local lista en http://localhost:${String(info.port)}/api`);
});
