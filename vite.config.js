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
        products: './products.html',
        about: './about.html',
        support: './support.html',
        profile: './profile.html',
        contact: './contact.html',
        error: './404.html'
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
});
