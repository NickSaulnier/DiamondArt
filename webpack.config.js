const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (_, { mode }) => ({
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: mode === 'production' ? '[name].[contenthash].js' : '[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    static: { directory: path.join(__dirname, 'public') },
    port: 3001,
    hot: true,
  },
  devtool: mode === 'development' ? 'eval-source-map' : 'source-map',
});
