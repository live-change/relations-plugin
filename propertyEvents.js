const { generateAnyId } = require("./utilsAny.js");

function defineSetEvent(config, context) {
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

function defineUpdateEvent(config, context) {
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

function defineResetEvent(config, context) {
  const {
    service, modelRuntime, joinedOthersPropertyName, modelName, otherPropertyNames
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Reset'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    execute({ identifiers }) {
      const id = generateId(otherPropertyNames, identifiers)
      return modelRuntime().delete(id)
    }
  })
}

module.exports = { defineSetEvent, defineUpdateEvent, defineResetEvent }
