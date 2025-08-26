// babel.config.mjs
export default function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // keep any other plugins (e.g., expo-router)
      [
        "module-resolver",
        {
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
          alias: {
            "@": "./", // or "./src" if that's your structure
          },
        },
      ],
    ],
  };
}
