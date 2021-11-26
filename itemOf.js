const App = require("@live-change/framework")
const { PropertyDefinition, ViewDefinition, IndexDefinition, ActionDefinition, EventDefinition } = App

const {
  extractIdParts, extractRange, extractIdentifiers, extractObjectData, defineProperties, defineIndex,
  processModelsAnnotation
} = require('./utils.js')

function defineView(config, context) {
  const { service, modelRuntime, otherPropertyNames, joinedOthersPropertyName, joinedOthersClassName,
    modelName, others, model } = context
  const indexName = 'by'+context.joinedOthersClassName
  const viewProperties = {}
  for (let i = 0; i < others.length; i++) {
    viewProperties[otherPropertyNames[i]] = new PropertyDefinition({
      type: others[i],
      validation: ['nonEmpty']
    })
  }
  const viewName = joinedOthersPropertyName + 'Owned' + modelName + 's'
  service.views[viewName] = new ViewDefinition({
    name: viewName,
    properties: {
      ...viewProperties,
      ...App.utils.rangeProperties
    },
    returns: {
      type: Array,
      of: {
        type: model
      }
    },
    access: config.readAccess,
    daoPath(properties, { client, context }) {
      const idParts = extractIdParts(otherPropertyNames, properties)
      const range = extractRange(properties)
      const path = modelRuntime().sortedIndexRangePath(indexName, idParts, range)
      return path
    }
  })
}

module.exports = function(service, app) {
  processModelsAnnotation(service, app, 'propertyOf', (config, context) => {

    defineProperties(context.model, context.others, context.otherPropertyNames)
    defineIndex(context.model, context.joinedOthersClassName, context.otherPropertyNames)

    if(config.readAccess) {
      defineView(config, context)
    }
    /// TODO: multiple views with limited fields

    if(config.setAccess || config.writeAccess) {
      defineCreateAction(config, context)
    }

    if(config.updateAccess || config.writeAccess) {
      defineUpdateAction(config, context)
    }

    if(config.resetAccess || config.writeAccess) {
      defineReleteAction(config, context);
    }
  })
}