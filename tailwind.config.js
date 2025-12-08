// real-estate-tracker-app/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
content: [
"./index.html",
// This scans all files in the src directory for Tailwind classes
"./src/**/*.{js,ts,jsx,tsx}", 
],
theme: {
extend: {},
},
plugins: [],
}
