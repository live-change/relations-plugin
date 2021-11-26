const App = require("@live-change/framework")
const { PropertyDefinition, ViewDefinition, IndexDefinition, ActionDefinition, EventDefinition } = App

const {
  extractIdParts, extractIdentifiers, extractObjectData, defineProperties, defineIndex,
  processModelsAnnotation
} = require('./utils.js')
const {generateId} = require("./utils");


function defineView(config, context) {
  const { service, modelRuntime, otherPropertyNames, joinedOthersPropertyName, modelName, others, model } = context
  const viewProperties = {}
  for (let i = 0; i < others.length; i++) {
    viewProperties[otherPropertyNames[i]] = new PropertyDefinition({
      type: others[i],
      validation: ['nonEmpty']
    })
  }
  const viewName = joinedOthersPropertyName + 'Owned' + modelName
  service.views[viewName] = new ViewDefinition({
    name: viewName,
    properties: {
      ...viewProperties
    },
    returns: {
      type: model,
    },
    access: config.readAccess,
    daoPath(properties, { client, context }) {
      const idParts = extractIdParts(otherPropertyNames, properties)
      const id = idParts.length > 1 ? idParts.map(p => JSON.stringify(p)).join(':') : idParts[0]
      const path = modelRuntime().path(id)
      console.log("PROPERTY ID", id ,"PATH", path, "OF", properties)
      //return modelRuntime().indexObjectPath('by' + others.join('And'), idParts)
      return path
    }
  })
}

async function defineSetEvent(config, context) {
  const {
    service, modelRuntime, joinedOthersPropertyName, modelName, otherPropertyNames
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Set'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    execute(properties) {
      const id = generateId(otherPropertyNames, properties.identifiers)
      return modelRuntime().create({ ...properties.data, ...properties.identifiers, id })
    }
  })
}

async function defineSetAction(config, context) {
  const {
    service, app, model,  defaults,
    otherPropertyNames, joinedOthersPropertyName, modelName, writeableProperties, joinedOthersClassName
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Set'
  const actionName = 'set' + joinedOthersClassName + 'Owned' + modelName
  service.actions[actionName] = new ActionDefinition({
    name: actionName,
    properties: {
      ...(model.properties)
    },
    access: config.setAccess || config.writeAccess,
    skipValidation: true,
    queuedBy: otherPropertyNames,
    waitForEvents: true,
    async execute(properties, {client, service}, emit) {
      const identifiers = extractIdentifiers(otherPropertyNames, properties)
      const data = extractObjectData(writeableProperties, properties, defaults)
      await App.validation.validate(data, validators, { source: action, action, service, app, client })
      emit({
        type: eventName,
        identifiers, data
      })
    }
  })
  const action = service.actions[actionName]
  const validators = App.validation.getValidators(action, service, action)
}

async function defineUpdateEvent(config, context) {
  const {
    service, modelRuntime, joinedOthersPropertyName, modelName, otherPropertyNames
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Updated'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    execute(properties) {
      const id = generateId(otherPropertyNames, properties.identifiers)
      return modelRuntime().update(id, { ...properties.data, ...properties.identifiers })
    }
  })
}

async function defineUpdateAction(config, context) {
  const {
    service, app, model, modelRuntime,
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
    queuedBy: otherPropertyNames,
    waitForEvents: true,
    async execute(properties, {client, service}, emit) {
      const identifiers = extractIdentifiers(otherPropertyNames, properties)
      const entity = await modelRuntime().get(identifiers.id)
      if (!entity) throw new Error('not_found')
      const data = extractObjectData(writeableProperties, properties, entity)
      await App.validation.validate(data, validators, { source: action, action, service, app, client })
      emit({
        type: eventName,
        identifiers, data
      })
    }
  })
  const action = service.actions[actionName]
  const validators = App.validation.getValidators(action, service, action)
}

async function defineResetEvent(config, context) {
  const {
    service, modelRuntime, joinedOthersPropertyName, modelName, otherPropertyNames
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Reset'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    execute({identifiers}) {
      const id = generateId(otherPropertyNames, identifiers)
      return modelRuntime().delete(id)
    }
  })
}

async function defineResetAction(config, context) {
  const {
    service, modelRuntime,
    otherPropertyNames, joinedOthersPropertyName, modelName,  joinedOthersClassName
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Reset'
  const actionName = 'reset' + joinedOthersClassName + 'Owned' + modelName
  service.actions[actionName] = new ActionDefinition({
    name: actionName,
    access: config.resetAccess || config.writeAccess,
    queuedBy: otherPropertyNames,
    waitForEvents: true,
    async execute(properties, {client, service}, emit) {
      const identifiers = extractIdentifiers(otherPropertyNames, properties)
      const entity = await modelRuntime().get(identifiers.id)
      if (!entity) throw new Error('not_found')
      emit({
        type: eventName,
        identifiers
      })
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

    defineSetEvent(config, context)
    defineUpdateEvent(config, context)
    defineResetEvent(config, context)

    if(config.setAccess || config.writeAccess) {
      defineSetAction(config, context)
    }

    if(config.updateAccess || config.writeAccess) {
      defineUpdateAction(config, context)
    }

    if(config.resetAccess || config.writeAccess) {
      defineResetAction(config, context);
    }
  })
}