const App = require("@live-change/framework")
const { PropertyDefinition, ViewDefinition, IndexDefinition, ActionDefinition, EventDefinition } = App


function defineProperties(parents, model, parentPropertyNames) {
  for (let i = 0; i < parents.length; i++) {
    model.properties[parentPropertyNames[i]] = new PropertyDefinition({
      type: parents[i],
      validation: ['nonEmpty']
    })
  }
}

function defineIndex(model, joinedParentsClassName, parentPropertyNames) {
  model.indexes['by' + joinedParentsClassName] = new IndexDefinition({
    property: parentPropertyNames
  })
}

function defineView(joinedParentsPropertyName, modelName, service, config, modelRuntime, parents, parentPropertyNames) {
  const viewProperties = {}
  for (let i = 0; i < parents.length; i++) {
    viewProperties[parentPropertyNames[i]] = new PropertyDefinition({
      type: parents[i],
      validation: ['nonEmpty']
    })
  }
  const viewName = joinedParentsPropertyName + 'Owned' + modelName
  service.views[viewName] = new ViewDefinition({
    name: viewName,
    properties: {
      ...viewProperties
    },
    access: config.readAccess,
    daoPath(properties, { client, context }) {
      const idParts = extractIdParts(parentPropertyNames, properties)
      const id = idParts.length > 1 ? idParts.map(p => JSON.stringify(p)).join(':') : idParts[0]
      const path = modelRuntime().path(id)
      console.log("PROPERTY ID", id ,"PATH", path, "OF", properties)
      //return modelRuntime().indexObjectPath('by' + parents.join('And'), idParts)
      return path
    }
  })
}

function extractIdParts(parentPropertyNames, properties) {
  const idParts = []
  for (const propertyName of parentPropertyNames) {
    idParts.push(properties[propertyName])
  }
  return idParts
}

function extractIdentifiers(parentPropertyNames, properties) {
  const identifiers = {}
  const idParts = []
  for (const propertyName of parentPropertyNames) {
    identifiers[propertyName] = properties[propertyName]
    idParts.push(properties[propertyName])
  }
  identifiers.id = idParts.length > 1 ? idParts.map(p => JSON.stringify(p)).join(':') : idParts[0]
  return identifiers
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

async function defineSetAction(joinedParentsPropertyName, modelName, service, parentPropertyNames, modelRuntime, joinedParentsClassName, model, config, writeableProperties, defaults, app) {
  const eventName = joinedParentsPropertyName + 'Owned' + modelName + 'Set'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    execute(properties) {
      return modelRuntime().create({ ...properties.data, ...properties.identifiers })
    }
  })
  const actionName = 'set' + joinedParentsClassName + 'Owned' + modelName
  service.actions[actionName] = new ActionDefinition({
    name: actionName,
    properties: {
      ...(model.properties)
    },
    access: config.setAccess || config.writeAccess,
    skipValidation: true,
    queuedBy: parentPropertyNames,
    waitForEvents: true,
    async execute(properties, {client, service}, emit) {
      const identifiers = extractIdentifiers(parentPropertyNames, properties)
      const data = extractObjectData(writeableProperties, properties, defaults)
      await App.validation.validate(data, validators, {source: action, action, service, app, client})
      emit({
        type: eventName,
        identifiers, data
      })
    }
  })
  const action = service.actions[actionName]
  const validators = App.validation.getValidators(action, service, action)
}

async function defineUpdateAction(joinedParentsPropertyName, modelName, service, modelRuntime, joinedParentsClassName, model, config, parentPropertyNames, writeableProperties, app) {
  const eventName = joinedParentsPropertyName + 'Owned' + modelName + 'Updated'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    execute(properties) {
      return modelRuntime().update(properties.identifiers.id, {...properties.data, ...properties.identifiers})
    }
  })
  const actionName = 'update' + joinedParentsClassName + 'Owned' + modelName
  service.actions[actionName] = new ActionDefinition({
    name: actionName,
    properties: {
      ...(model.properties)
    },
    access: config.updateAccess || config.writeAccess,
    skipValidation: true,
    queuedBy: parentPropertyNames,
    waitForEvents: true,
    async execute(properties, {client, service}, emit) {
      const identifiers = extractIdentifiers(parentPropertyNames, properties)
      const entity = await modelRuntime().get(identifiers.id)
      if (!entity) throw new Error('not_found')
      const data = extractObjectData(writeableProperties, properties, entity)
      await App.validation.validate(data, validators, {source: action, action, service, app, client})
      emit({
        type: eventName,
        identifiers, data
      })
    }
  })
  const action = service.actions[actionName]
  const validators = App.validation.getValidators(action, service, action)
}

async function defineResetAction(joinedParentsPropertyName, modelName, service, modelRuntime, joinedParentsClassName, config, parentPropertyNames) {
  const eventName = joinedParentsPropertyName + 'Owned' + modelName + 'Reset'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    execute({identifiers}) {
      return modelRuntime().delete(identifiers.id)
    }
  })
  const actionName = 'reset' + joinedParentsClassName + 'Owned' + modelName
  service.actions[actionName] = new ActionDefinition({
    name: actionName,
    access: config.resetAccess || config.writeAccess,
    queuedBy: parentPropertyNames,
    waitForEvents: true,
    async execute(properties, {client, service}, emit) {
      const identifiers = extractIdentifiers(parentPropertyNames, properties)
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
  if (!service) throw new Error("no service")
  if (!app) throw new Error("no app")

  for(let modelName in service.models) {
    const model = service.models[modelName]

    console.log("PO", modelName, model.propertyOf)

    if(model.propertyOf) {
      if(model.propertyOfProcessed) throw new Error("duplicated processing of propertyOf processor")
      model.propertyOfProcessed = true
      const originalModelProperties = { ...model.properties }
      const modelProperties = Object.keys(model.properties)
      const modelPropertyName = modelName.slice(0, 1).toLowerCase() + modelName.slice(1)
      const defaults = App.utils.generateDefault(originalModelProperties)
      function modelRuntime() {
        return service._runtime.models[modelName]
      }
      if(!model.indexes) model.indexes = {}

      let config = model.propertyOf // only single ownership is possible, but may be owned by objects set
      if(typeof config == 'string' || Array.isArray(config)) config = { what: config }

      console.log("MODEL " + modelName + " IS PROPERTY OF " + config.what)

      const parents = (Array.isArray(config.what) ? config.what : [ config.what ])
          .map(parent => parent.name ? parent.name : parent)

      const writeableProperties = modelProperties || config.writableProperties
      console.log("PPP", parents)
      const parentPropertyNames = parents.map(parent => parent.slice(0, 1).toLowerCase() + parent.slice(1))
      const joinedParentsPropertyName = parentPropertyNames[0] +
          (parents.length > 1 ? ('And' + parents.slice(1).join('And')) : '')
      const joinedParentsClassName = parents.join('And')

      defineProperties(parents, model, parentPropertyNames)
      defineIndex(model, joinedParentsClassName, parentPropertyNames)
      if(config.readAccess) {
        defineView(joinedParentsPropertyName, modelName, service, config, modelRuntime, parents, parentPropertyNames)
      }
      /// TODO: multiple views with limited fields

      if(config.setAccess || config.writeAccess) {
        defineSetAction(joinedParentsPropertyName, modelName, service, parentPropertyNames,
            modelRuntime, joinedParentsClassName, model, config, writeableProperties, defaults, app)
      }

      if(config.updateAccess || config.writeAccess) {
        defineUpdateAction(joinedParentsPropertyName, modelName, service, modelRuntime, joinedParentsClassName,
            model, config, parentPropertyNames, writeableProperties, app)
      }

      if(config.resetAccess || config.writeAccess) {
        defineResetAction(joinedParentsPropertyName, modelName, service, modelRuntime, joinedParentsClassName,
            config, parentPropertyNames);
      }
    }
  }
}