import { importAsString } from "rollup-plugin-string-import";
export default [
  {
    input: "src/app.js",
    output: {
      file: "dist/app.js",
      format: "esm",
    },
    onwarn: (warning) => {
      if (warning.code === "UNRESOLVED_IMPORT") return;
    },
  },
];
