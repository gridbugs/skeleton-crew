const path = require('path');

module.exports = (env, argv) => {
  return {
    mode: 'production',
    entry: {
      main: path.resolve('.', 'src', 'main.js'),
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
    }
  }
}
