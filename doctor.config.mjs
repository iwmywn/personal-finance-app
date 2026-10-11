/** @type {import('react-doctor/api').ReactDoctorConfig } */
const reactDoctorConfig = {
  projects: ["personal-finance-app"],
  rules: {
    "react-doctor/only-export-components": "off",
    "react-doctor/prefer-tag-over-role": "off",
    "react-doctor/duplicate-jsx-subtree": "off",
    "react-doctor/react-compiler-no-manual-memoization": "off",
    "react-doctor/prefer-useReducer": "off",
    "react-doctor/no-giant-component": "off",
    "react-doctor/no-high-complexity-react-function": "off",
    "react-doctor/require-pnpm-hardening": "off",
  },
}

export default reactDoctorConfig
