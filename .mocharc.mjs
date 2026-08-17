process.env.NODE_ENV = "test"
export default {
  spec: "test/**/*.spec.ts",
  require: "ts-node/register/transpile-only",
  watchExtensions: "ts",
  extension: "ts",
}
