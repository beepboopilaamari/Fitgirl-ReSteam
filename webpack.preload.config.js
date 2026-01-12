const path = require('path');

module.exports = {
  target: 'electron-preload',
  entry: './src/preload/preload.ts',
  output: {
    path: path.resolve(__dirname, 'dist/preload'),
    filename: 'preload.js'
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
  }
};
