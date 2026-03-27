/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /** 美团主品牌黄 */
        meituan: {
          DEFAULT: "#FFC300",
          hover: "#E6AF00",
          soft: "#FFF8E1",
          border: "#E6C200",
        },
      },
    },
  },
  plugins: [],
};
