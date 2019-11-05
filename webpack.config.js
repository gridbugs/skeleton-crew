const path = require('path');

module.exports = (env, argv) => {
  return {
    mode: 'development',
    entry: {
      main: path.resolve('.', 'src', 'main.js'),
    },
    output: {
      path: path.resolve(__dirname, 'dist', 'public'),
      filename: 'bundle.js',
    }
  }
}
