const propertyOf = require('./propertyOf.js')
const itemOf = require('./itemOf.js')

module.exports = function(app, services) {

  app.defaultProcessors.push(propertyOf)
  app.defaultProcessors.push(itemOf)
}

module.exports.processors = [ propertyOf, itemOf ]