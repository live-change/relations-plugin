const App = require("@live-change/framework")
const { PropertyDefinition, ViewDefinition, IndexDefinition, ActionDefinition, EventDefinition } = App

const {
  extractRange, extractObjectData
} = require('./utils.js')

const {
  extractTypeAndIdParts, extractIdentifiersWithTypes, defineAnyProperties, defineAnyIndex,
  processModelsAnyAnnotation
} = require('./utilsAny.js')

function defineView(config, context) {
  const { service, modelRuntime, otherPropertyNames, joinedOthersPropertyName, joinedOthersClassName,
    modelName, others, model } = context
  const indexName = 'by'+context.joinedOthersClassName
  const viewProperties = {}
  for (let i = 0; i < others.length; i++) {
    viewProperties[otherPropertyNames[i]] = new PropertyDefinition({
      type: 'String',
      validation: ['nonEmpty']
    })
    viewProperties[otherPropertyNames[i] + 'Type'] = new PropertyDefinition({
      type: 'String',
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
      const typeAndIdParts = extractTypeAndIdParts(otherPropertyNames, properties)
      const range = extractRange(properties)
      const path = modelRuntime().sortedIndexRangePath(indexName, typeAndIdParts, range)
      return path
    }
  })
}

const {
  defineCreatedEvent, defineUpdatedEvent, defineDeletedEvent, defineTransferredEvent,
} = require('./itemEvents.js')
const {defineTransferEvent} = require("./itemEvents");

function defineCreateAction(config, context) {
  const {
    service, app, model,  defaults, modelPropertyName, modelRuntime,
    otherPropertyNames, joinedOthersPropertyName, modelName, writeableProperties, joinedOthersClassName
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Created'
  const actionName = 'set' + joinedOthersClassName + 'Owned' + modelName
  service.actions[actionName] = new ActionDefinition({
    name: actionName,
    properties: {
      ...(model.properties)
    },
    access: config.createAccess || config.writeAccess,
    skipValidation: true,
    //queuedBy: otherPropertyNames,
    waitForEvents: true,
    async execute(properties, { client, service }, emit) {
      const id = properties[modelPropertyName] || app.generateUid()
      const entity = await modelRuntime().get(id)
      if(entity) throw 'exists'
      const identifiers = extractIdentifiersWithTypes(otherPropertyNames, properties)
      const data = extractObjectData(writeableProperties, properties, defaults)
      await App.validation.validate(data, validators, { source: action, action, service, app, client })
      emit({
        type: eventName,
        [modelPropertyName]: id,
        identifiers, data
      })
    }
  })
  const action = service.actions[actionName]
  const validators = App.validation.getValidators(action, service, action)
}

function defineUpdateAction(config, context) {
  const {
    service, app, model, modelRuntime, modelPropertyName,
    otherPropertyNames, joinedOthersPropertyName, modelName, writeableProperties, joinedOthersClassName
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Updated'
  const actionName = 'update' + joinedOthersClassName + 'Owned' + modelName
  service.actions[actionName] = new ActionDefinition({
    name: actionName,
    properties: {
      ...(model.properties)
    },
    access: config.updateAccess || config.writeAccess,
    skipValidation: true,
    //queuedBy: otherPropertyNames,
    waitForEvents: true,
    async execute(properties, { client, service }, emit) {
      const id = properties[modelPropertyName]
      const entity = await modelRuntime().get(id)
      if(!entity) throw 'not_found'
      const entityTypeAndIdParts = extractTypeAndIdParts(otherPropertyNames, entity)
      const typeAndIdParts = extractTypeAndIdParts(otherPropertyNames, properties)
      if(JSON.stringify(entityTypeAndIdParts) != JSON.stringify(typeAndIdParts)) {
        throw 'not_authorized'
      }
      const identifiers = extractIdentifiersWithTypes(otherPropertyNames, properties)
      const data = extractObjectData(writeableProperties, properties, entity)
      await App.validation.validate(data, validators, { source: action, action, service, app, client })
      emit({
        type: eventName,
        [modelPropertyName]: id,
        identifiers,
        data
      })
    }
  })
  const action = service.actions[actionName]
  const validators = App.validation.getValidators(action, service, action)
}

function defineDeleteAction(config, context) {
  const {
    service, app, model, modelRuntime, modelPropertyName,
    otherPropertyNames, joinedOthersPropertyName, modelName, writeableProperties, joinedOthersClassName
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Deleted'
  const actionName = 'delete' + joinedOthersClassName + 'Owned' + modelName
  service.actions[actionName] = new ActionDefinition({
    name: actionName,
    properties: {
      ...(model.properties)
    },
    access: config.deleteAccess || config.writeAccess,
    skipValidation: true,
    //queuedBy: otherPropertyNames,
    waitForEvents: true,
    async execute(properties, { client, service }, emit) {
      const id = properties[modelPropertyName]
      const entity = await modelRuntime().get(id)
      if(!entity) throw new Error('not_found')
      const entityTypeAndIdParts = extractTypeAndIdParts(otherPropertyNames, entity)
      const typeAndIdParts = extractTypeAndIdParts(otherPropertyNames, properties)
      if(JSON.stringify(entityTypeAndIdParts) != JSON.stringify(typeAndIdParts)) {
        throw new Error('not_authorized')
      }
      emit({
        type: eventName,
        [modelPropertyName]: id
      })
    }
  })
}

function defineSortIndex(context, sortFields) {
  if(!Array.isArray(sortFields)) sortFields = [sortFields]
  console.log("DEFINE SORT INDEX", sortFields)
  const sortFieldsUc = sortFields.map(fd => fd.slice(0, 1).toUpperCase() + fd.slice(1))
  const indexName = 'by' + context.joinedOthersClassName + sortFieldsUc.join('')
  context.model.indexes[indexName] = new IndexDefinition({
    property: [...(context.otherPropertyNames.map(prop => [prop + 'Type', prop])), ...sortFields]
  })
}

module.exports = function(service, app) {
  processModelsAnyAnnotation(service, app, 'itemOfAny', (config, context) => {

    defineAnyProperties(context.model, context.otherPropertyNames)
    defineAnyIndex(context.model, context.joinedOthersClassName, context.otherPropertyNames)

    if(config.sortBy) {
      for(const sortFields of config.sortBy) {
        defineSortIndex(context, sortFields)
      }
    }

    if(config.readAccess) {
      defineView(config, context)
    }
    /// TODO: multiple views with limited fields

    defineCreatedEvent(config, context)
    defineUpdatedEvent(config, context)
    defineTransferredEvent(config, context)
    defineDeletedEvent(config, context)

    if(config.setAccess || config.writeAccess) {
      defineCreateAction(config, context)
    }

    if(config.updateAccess || config.writeAccess) {
      defineUpdateAction(config, context)
    }

    if(config.resetAccess || config.writeAccess) {
      defineDeleteAction(config, context)
    }
  })
}