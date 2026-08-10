/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F5F0',
        ink: '#26312E',
        teal: { DEFAULT: '#1F6F5C', light: '#E4EFEC', dark: '#164F41' },
        coral: { DEFAULT: '#E2734F', light: '#FBE9E2' },
        amber: { DEFAULT: '#C98A2A', light: '#FAF0DD' },
        line: '#E1DED4',
      },
      fontFamily: {
        serif: ['Lora', '"Noto Sans Bengali"', 'Georgia', 'serif'],
        sans: ['Inter', '"Noto Sans Bengali"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
