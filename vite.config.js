import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: process.env.DISABLE_HMR !== 'true'
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        profile: './profile.html',
        error: './404.html'
      }
    }
  }
});
