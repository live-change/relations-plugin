const App = require("@live-change/framework")
const { PropertyDefinition, ViewDefinition, IndexDefinition, ActionDefinition, EventDefinition } = App

function defineSetEvent(config, context, generateId) {
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

function defineUpdatedEvent(config, context, generateId) {
  const {
    service, modelRuntime, joinedOthersPropertyName, modelName, otherPropertyNames
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Updated'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    execute(properties) {
      const id = generateId(otherPropertyNames, properties.identifiers)
      return modelRuntime().update(id, { ...properties.data, /*...properties.identifiers*/ })
    }
  })
}

function defineTransferredEvent(config, context, generateId) {
  const {
    service, modelRuntime, joinedOthersPropertyName, modelName, otherPropertyNames
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Transferred'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    async execute(properties) {
      const fromId = generateId(otherPropertyNames, properties.from)
      const toId = generateId(otherPropertyNames, properties.to)
      const data = await modelRuntime().get(fromId)
      await modelRuntime().create({
        ...data,
        ...properties.to,
        id: toId
      })
      await modelRunntime().delete(fromId)
      return toId
    }
  })
}

function defineResetEvent(config, context, generateId) {
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

module.exports = { defineSetEvent, defineUpdatedEvent, defineTransferredEvent, defineResetEvent }
