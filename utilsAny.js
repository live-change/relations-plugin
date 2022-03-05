const App = require("@live-change/framework")
const { PropertyDefinition, ViewDefinition, IndexDefinition, ActionDefinition, EventDefinition } = App

function extractTypeAndIdParts(otherPropertyNames, properties) {
  const typeAndIdParts = []
  for (const propertyName of otherPropertyNames) {
    typeAndIdParts.push(properties[propertyName+'Type'])
    typeAndIdParts.push(properties[propertyName])
  }
  return typeAndIdParts
}

function extractIdentifiersWithTypes(otherPropertyNames, properties) {
  const identifiers = {}
  for (const propertyName of otherPropertyNames) {
    identifiers[propertyName] = properties[propertyName]
    identifiers[propertyName + 'Type'] = properties[propertyName + 'Type']
  }
  return identifiers
}

function generateAnyId(otherPropertyNames, properties) {
  return otherPropertyNames
      .map(p => [p+'Type', p])
      .flat()
      .map(p => JSON.stringify(properties[p])).join(':')
}

function defineAnyProperties(model, names) {
  for (let i = 0; i < types.length; i++) {
    model.properties[names[i]] = new PropertyDefinition({
      type: String,
      validation: ['nonEmpty']
    })
    model.properties[names[i]+'Type'] = new PropertyDefinition({
      type: String,
      validation: ['nonEmpty']
    })
  }
}

function defineAnyIndex(model, what, props) {
  model.indexes['by' + what] = new IndexDefinition({
    property: props.map(prop => [prop+'Type', prop]).flat()
  })
}

function processModelsAnyAnnotation(service, app, annotation, cb) {
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

      const otherPropertyNames = (Array.isArray(config.to) ? config.to : [config.to ?? 'owner'])
          .map(other => other.name ? other.name : other)

      const writeableProperties = modelProperties || config.writeableProperties
      const others = otherPropertyNames.map(other => other.slice(0, 1).toLowerCase() + other.slice(1))
      const joinedOthersPropertyName = otherPropertyNames[0] +
          (others.length > 1 ? ('And' + others.slice(1).join('And')) : '')
      const joinedOthersClassName = others.join('And')

      const context = {
        service, app, model, originalModelProperties, modelProperties, modelPropertyName, defaults, modelRuntime,
        otherPropertyNames, joinedOthersPropertyName, modelName, writeableProperties, joinedOthersClassName, others
      }

      cb(config, context)
    }
  }
}

module.exports = {
  extractTypeAndIdParts, extractIdentifiersWithTypes, defineAnyProperties, defineAnyIndex,
  processModelsAnyAnnotation, generateAnyId
}