import { resolve } from 'path';
// base './' keeps asset paths relative so it works under https://<user>.github.io/<repo>/
export default {
  base: './', server: { host: true },
  build: { target: 'es2020', rollupOptions: { input: { main: resolve(__dirname, 'index.html'), showcase: resolve(__dirname, 'showcase.html'), creator: resolve(__dirname, 'creator.html') } } },
};
