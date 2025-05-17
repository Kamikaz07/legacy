module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add fallbacks for Node.js core modules
      webpackConfig.resolve.fallback = {
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        http: require.resolve("stream-http"),
        https: require.resolve("https-browserify"),
        zlib: require.resolve("browserify-zlib"),
        url: require.resolve("url"),
        vm: false, // Add fallback for vm module
      };

      // Suppress source map warnings
      webpackConfig.ignoreWarnings = [
        // Ignore source map warnings from node_modules
        function ignoreSourceMapWarnings(warning) {
          return (
            warning.module?.resource?.includes("node_modules") &&
            warning.details?.includes("source-map-loader")
          );
        },
      ];

      return webpackConfig;
    },
  },
};
