const path = require('path');

module.exports = {
  target: 'electron-main',
  entry: './src/main/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'index.js'
  },
  optimization: {
    minimize: false
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  node: {
    __dirname: false,
    __filename: false
  },
  externals: {
    'better-sqlite3': 'commonjs better-sqlite3',
    'electron': 'commonjs electron',
    'electron-log': 'commonjs electron-log',
    'electron-store': 'commonjs electron-store',
    'cheerio': 'commonjs cheerio',
    'axios': 'commonjs axios',
    'node-html-parser': 'commonjs node-html-parser',
    'sanitize-html': 'commonjs sanitize-html'
  }
};
