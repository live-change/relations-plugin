const propertyOf = require('./propertyOf.js')
const itemOf = require('./itemOf.js')

const propertyOfAny = require('./propertyOfAny.js')
const itemOfAny = require('./itemOfAny.js')

module.exports = function(app, services) {

  app.defaultProcessors.push(propertyOf)
  app.defaultProcessors.push(itemOf)

  app.defaultProcessors.push(propertyOfAny)
  app.defaultProcessors.push(itemOfAny)

}

module.exports.processors = [ propertyOf, itemOf ]