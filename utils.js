const App = require("@live-change/framework")
const { PropertyDefinition, ViewDefinition, IndexDefinition, ActionDefinition, EventDefinition } = App

function extractIdParts(otherPropertyNames, properties) {
  const idParts = []
  for (const propertyName of otherPropertyNames) {
    idParts.push(properties[propertyName])
  }
  return idParts
}

function extractRange(properties) {
  return {
    gt: properties.gt,
    gte: properties.gte,
    lt: properties.lt,
    lte: properties.lte,
    reverse: properties.reverse,
    limit: properties.limit
  }
}

function extractIdentifiers(otherPropertyNames, properties) {
  const identifiers = {}
  for (const propertyName of otherPropertyNames) {
    identifiers[propertyName] = properties[propertyName]
  }
  return identifiers
}

function generateId(otherPropertyNames, properties) {
  return otherPropertyNames.length > 1
      ? otherPropertyNames.map(p => JSON.stringify(properties[p])).join(':')
      : properties[otherPropertyNames[0]]
}

function extractObjectData(writeableProperties, properties, defaults) {
  let updateObject = {}
  for (const propertyName of writeableProperties) {
    if (properties.hasOwnProperty(propertyName)) {
      newObject[propertyName] = properties[propertyName]
    }
  }
  return App.utils.mergeDeep({}, defaults, updateObject)
}

function defineProperties(model, types, names) {
  for (let i = 0; i < types.length; i++) {
    model.properties[names[i]] = new PropertyDefinition({
      type: types[i],
      validation: ['nonEmpty']
    })
  }
}

function defineIndex(model, what, props) {
  model.indexes['by' + what] = new IndexDefinition({
    property: props
  })
}

function processModelsAnnotation(service, app, annotation, cb) {
  if (!service) throw new Error("no service")
  if (!app) throw new Error("no app")

  for(let modelName in service.models) {
    const model = service.models[modelName]

    //console.log("PO", modelName, model[annotation])

    if (model[annotation]) {
      if (model[annotation + 'Processed']) throw new Error("duplicated processing of " + annotation + " processor")
      model[annotation + 'Processed'] = true
      const originalModelProperties = { ...model.properties }
      const modelProperties = Object.keys(model.properties)
      const modelPropertyName = modelName.slice(0, 1).toLowerCase() + modelName.slice(1)
      const defaults = App.utils.generateDefault(originalModelProperties)

      function modelRuntime() {
        return service._runtime.models[modelName]
      }

      if (!model.indexes) model.indexes = {}

      let config = model[annotation] // only single ownership is possible, but may be owned by objects set
      if (typeof config == 'string' || Array.isArray(config)) config = {what: config}

      console.log("MODEL " + modelName + " IS "+ annotation +" " + config.what)

      const others = (Array.isArray(config.what) ? config.what : [config.what])
          .map(other => other.name ? other.name : other)

      const writeableProperties = modelProperties || config.writeableProperties
      console.log("PPP", others)
      const otherPropertyNames = others.map(other => other.slice(0, 1).toLowerCase() + other.slice(1))
      const joinedOthersPropertyName = otherPropertyNames[0] +
          (others.length > 1 ? ('And' + others.slice(1).join('And')) : '')
      const joinedOthersClassName = others.join('And')

      const context = {
        service, app, model, originalModelProperties, modelProperties, modelPropertyName, defaults, modelRuntime,
        otherPropertyNames, joinedOthersPropertyName, modelName, writeableProperties, joinedOthersClassName,
        others
      }

      cb(config, context)
    }
  }
}

module.exports = {
  extractIdParts, extractIdentifiers, extractObjectData, defineProperties, defineIndex,
  processModelsAnnotation, extractRange, generateId
}