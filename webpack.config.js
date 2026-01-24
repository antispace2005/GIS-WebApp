// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const isProduction = process.env.NODE_ENV === "production";

const stylesHandler = isProduction
  ? MiniCssExtractPlugin.loader
  : "style-loader";

const config = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
  },
  devServer: {
    open: true,
    host: "localhost",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "index.html",
    }),

    // Add your plugins here
    // Learn more about plugins from https://webpack.js.org/configuration/plugins/
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [stylesHandler, "css-loader"],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
        type: "asset",
      },

      {
        test: /\.html$/i,
        use: ["html-loader"],
      },
      {
        // Select the file types you want to process (e.g., images, fonts)
        test: /\.(png|jpe?g|gif|svg||json|geojson|eot|ttf|woff2?)$/i,
        type: "asset/resource",
        generator: {
          filename: "[path][name][ext]",
        },
      },

      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
};

module.exports = () => {
  config.devServer = {
    open: true,
    host: "localhost",
    proxy: [
      {
        // This intercepts any request starting with /geoserver
        context: ["/geoserver"],
        // Target is your local GeoServer instance
        target: "http://localhost:8090",
        changeOrigin: true,
        // Optional: remove /geoserver from the path if your
        // GeoServer is at the root, but usually /geoserver is correct
        // pathRewrite: { '^/geoserver': '' },
      },
    ],
  };
  if (isProduction) {
    config.mode = "production";

    config.plugins.push(new MiniCssExtractPlugin());
  } else {
    config.mode = "development";
  }
  return config;
};
