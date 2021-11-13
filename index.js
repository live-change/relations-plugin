const propertyOf = require('./propertyOf.js')

module.exports = function(app, services) {

  app.defaultProcessors.push(propertyOf)
}

module.exports.processors = [ propertyOf ]