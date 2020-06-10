const google = require('./google')

const configParsers = {
  global: (_, v) => v === 'true',
  default: (type, v) => type === 'bool' ? v === 'true' : v,
  options: (_, v) => v,
  creatable: (_, v) => v === 'true',
}

const allowedOptions = {
  date: new Set(['global', 'default']),
  bool: new Set(['global', 'default']),
  number: new Set(['global', 'default']),
  string: new Set(['global', 'default']),
  select: new Set(['global', 'default', 'creatable', 'options']),
}

async function resolveOptions(docId, range) {
  const options = await google.getRange(docId, { range })
  return options.map(opt => ({ value: opt.value, label: opt.label }))
}

async function parseConfig(docId, type, key, value) {
  switch (key) {
    case 'global':
      return value === 'true'
    case 'default':
      return (type === 'bool') ? (value === 'true') : value
    case 'options':
      return await resolveOptions(docId, value)
    case 'creatable':
      return value === 'true'
    default:
      return value
  }
}

async function parseColumnSchema(docId, schema, id) {
  const [label, type, ...options] = schema
  const allowed = allowedOptions[type]

  if (!allowed) {
    throw new Error(`schema error: unknown column type ${type}`)
  }

  const config = {}

  for (let c of options) {
    const [key, val] = c.split(':')

    if (!allowed.has(key)) {
      throw new Error(`schema error: column type ${type} cannot take option ${key}`)
    }

    config[key] = await parseConfig(docId, type, key, val)
  }

  return { id, label, type, config }
}

async function parseSchema(docId, configs) {
  const schema = {}
  for (let config of configs) {
    const [configType, ...cfg] = config
    if (configType === 'column') {
      schema.columns = schema.columns || []
      const column = await parseColumnSchema(docId, cfg, schema.columns.length)
      schema.columns.push(column)
    } else {
      schema[configType.toLowerCase()] = cfg[0]
    }
  }
  return schema
}

module.exports = parseSchema
