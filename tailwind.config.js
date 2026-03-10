/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Material Design 3 inspired palette
                primary: {
                    light: '#6750A4',
                    dark: '#D0BCFF',
                    DEFAULT: '#6750A4',
                },
                secondary: {
                    light: '#625B71',
                    dark: '#CCC2DC',
                    DEFAULT: '#625B71',
                },
                tertiary: {
                    light: '#7D5260',
                    dark: '#EFB8C8',
                    DEFAULT: '#7D5260',
                },
                error: {
                    light: '#B3261E',
                    dark: '#F2B8B5',
                    DEFAULT: '#B3261E',
                },
                surface: {
                    light: '#FEF7FF',
                    dark: '#141218',
                    DEFAULT: '#FEF7FF',
                },
                'on-surface': {
                    light: '#1D1B20',
                    dark: '#E6E1E5',
                    DEFAULT: '#1D1B20',
                },
                outline: {
                    light: '#79747E',
                    dark: '#938F99',
                    DEFAULT: '#79747E',
                }
            },
            elevation: {
                '1': '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
                '2': '0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
                '3': '0px 1px 3px 0px rgba(0, 0, 0, 0.30), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
            }
        },
    },
    plugins: [],
}
