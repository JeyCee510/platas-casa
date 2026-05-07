import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta neobrutalista inspirada en el mockup
        bg: '#E8F1FF',           // fondo lavanda claro
        surface: '#FFFFFF',
        ink: '#0A0A0A',          // borde y texto negro fuerte
        mint: '#C9F0D5',         // verde menta (header)
        sky: '#9BD8F4',          // celeste tarjetas
        peach: '#F5C6BA',        // rosa salmón
        lemon: '#FBE8A6',        // amarillo
        lilac: '#C7C0F4',        // lila
        bubble: '#F5C2E6',       // rosa
        teal: '#B7EDE6',         // turquesa pálido
      },
      boxShadow: {
        brut: '6px 6px 0 0 #0A0A0A',
        brutSm: '4px 4px 0 0 #0A0A0A',
        brutLg: '8px 8px 0 0 #0A0A0A',
      },
      borderWidth: {
        '3': '3px',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
