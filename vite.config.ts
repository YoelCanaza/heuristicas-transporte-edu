import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // Puerto propio: en localhost:5173 (el puerto por omisión de Vite) otro proyecto puede haber dejado
  // instalado un service worker que sirve su página en lugar de esta.
  // Si el 5180 está ocupado, Vite prueba con el siguiente (5181, 5182…) y muestra la dirección al arrancar.
  server: { port: 5180 },
});
