export default {
  input: "src/app.js",
  output: {
    file: "dist/app.js",
    format: "esm",
    sourcemap: "inline",
  },
  onwarn: (warning) => {
    if (warning.code === "UNRESOLVED_IMPORT") return;
  },
};
