const App = require("@live-change/framework")
const { PropertyDefinition, ViewDefinition, IndexDefinition, ActionDefinition, EventDefinition } = App

function defineCreatedEvent(config, context) {
  const {
    service, modelRuntime, joinedOthersPropertyName, modelName, modelPropertyName
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Created'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    execute(properties) {
      const id = properties[modelPropertyName]
      return modelRuntime().create({ ...properties.data, ...properties.identifiers, id })
    }
  })
}

function defineUpdatedEvent(config, context) {
  const {
    service, modelRuntime, joinedOthersPropertyName, modelName, modelPropertyName
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Updated'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    execute(properties) {
      const id = properties[modelPropertyName]
      return modelRuntime().update(id, { ...properties.data, ...properties.identifiers, id })
    }
  })
}

function defineTransferredEvent(config, context) {
  const {
    service, modelRuntime, joinedOthersPropertyName, modelName, modelPropertyName
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Transferred'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    execute(properties) {
      const id = properties[modelPropertyName]
      return modelRuntime().update(id, { ...properties.to, id })
    }
  })
}

function defineDeletedEvent(config, context) {
  const {
    service, modelRuntime, joinedOthersPropertyName, modelName, modelPropertyName
  } = context
  const eventName = joinedOthersPropertyName + 'Owned' + modelName + 'Deleted'
  service.events[eventName] = new EventDefinition({
    name: eventName,
    execute(properties) {
      const id = properties[modelPropertyName]
      return modelRuntime().delete(id)
    }
  })
}

module.exports = { defineCreatedEvent, defineUpdatedEvent, defineTransferredEvent, defineDeletedEvent }
