const path = require('path');
// const WebpackObfuscator = require('webpack-obfuscator')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: "production",
  entry: {
    background: './src/background.js',
    content: './src/content.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    publicPath: " ",
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  optimization: {
    splitChunks: false
  },
  experiments: {
    topLevelAwait: true // Needed for async in service worker
  },
  target: "webworker",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new CopyPlugin(
      {
        patterns: [
          {
            from: path.resolve(__dirname, "src/public/model.onnx"),
            to: path.resolve(__dirname, "dist/model.onnx")
          },
          {
            from: path.resolve(__dirname, "src/public/manifest.json"),
            to: path.resolve(__dirname, "dist/manifest.json")
          },
          {
            from: path.resolve(__dirname, "src/public/labels.json"),
            to: path.resolve(__dirname, "dist/labels.json")
          }
        ]
      }
    ),
    // new WebpackObfuscator({
    //   rotateStringArray: true,
    //   stringArrayEncoding: ["base64"],
    //   compact: true,
    //   selfDefending: true,
    //   stringArray: true
    // })
  ]
};
