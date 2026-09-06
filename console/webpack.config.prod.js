'use strict'
const { createWebpackConfigForProduction } = require('@commercetools-frontend/mc-scripts/webpack')
const config = createWebpackConfigForProduction({
  toggleFlags: {
    parallelism: false,
  },
})
config.devtool = false
module.exports = config
