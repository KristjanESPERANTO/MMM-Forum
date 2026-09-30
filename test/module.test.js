const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { runInNewContext } = require('node:vm')
const test = require('node:test')

function loadModule(relativePath, sandbox) {
  const source = readFileSync(join(__dirname, '..', relativePath), 'utf8')
  runInNewContext(source, sandbox, { filename: relativePath })
}

function loadFrontendModule() {
  let frontendModule
  loadModule('MMM-Forum.js', {
    config: { language: 'en' },
    Module: {
      register(_name, definition) {
        frontendModule = definition
      },
    },
  })
  return frontendModule
}

function loadNodeHelper(fetchImplementation) {
  const notifications = []
  const helperContext = {
    name: 'MMM-Forum',
    sendSocketNotification(...notification) {
      notifications.push(notification)
    },
  }
  const module = { exports: {} }

  loadModule('node_helper.js', {
    fetch: fetchImplementation,
    module,
    require(moduleName) {
      if (moduleName === 'cheerio') {
        return { load: () => () => ({ val: () => '' }) }
      }
      if (moduleName === 'logger') {
        return { debug() {}, error() {} }
      }
      if (moduleName === 'node_helper') {
        return { create: definition => definition }
      }
      throw new Error(`Unexpected module: ${moduleName}`)
    },
  })

  Object.assign(helperContext, {
    config: {
      baseUrl: 'https://forum.example/',
      username: 'ExampleUser',
    },
    loginSetCookieHeader: 'session=example',
  })

  return { helper: module.exports, helperContext, notifications }
}

test('parses timestamps in seconds, milliseconds, and ISO format', () => {
  const parse = loadFrontendModule().parseTimestampCandidate
  const expectedTimestamp = 1_700_000_000_000

  assert.equal(parse(1_700_000_000).getTime(), expectedTimestamp)
  assert.equal(parse(expectedTimestamp).getTime(), expectedTimestamp)
  assert.equal(parse('2023-11-14T22:13:20.000Z').getTime(), expectedTimestamp)
})

test('returns null for invalid timestamp candidates', () => {
  const parse = loadFrontendModule().parseTimestampCandidate

  for (const candidate of [null, '', '  ', 'not a date', Number.NaN, {}]) {
    assert.equal(parse(candidate), null)
  }
})

const apiCases = [
  {
    method: 'getUnreadTopics',
    property: 'topics',
    notification: 'MMM-FORUM_UNREAD_TOPICS',
  },
  {
    method: 'getUnreadNotifications',
    property: 'notifications',
    notification: 'MMM-FORUM_UNREAD_NOTIFICATIONS',
  },
  {
    method: 'getUnreadMessages',
    property: 'rooms',
    notification: 'MMM-FORUM_UNREAD_MESSAGES',
  },
]

for (const { method, property, notification } of apiCases) {
  test(`${method} emits returned ${property}`, async () => {
    const entries = [{ id: 1 }]
    const { helper, helperContext, notifications } = loadNodeHelper(async () => ({
      json: async () => ({ [property]: entries }),
      statusText: 'OK',
    }))

    await helper[method].call(helperContext)

    assert.deepEqual(notifications, [[notification, entries]])
  })

  test(`${method} emits an error for missing ${property}`, async () => {
    const { helper, helperContext, notifications } = loadNodeHelper(async () => ({
      json: async () => ({}),
      statusText: 'OK',
    }))

    await helper[method].call(helperContext)

    assert.deepEqual(notifications, [['MMM-FORUM_ERROR']])
  })
}

test('getUnreadMessages emits an error when fetch fails', async () => {
  const { helper, helperContext, notifications } = loadNodeHelper(async () => {
    throw new Error('network unavailable')
  })

  await helper.getUnreadMessages.call(helperContext)

  assert.deepEqual(notifications, [['MMM-FORUM_ERROR']])
})
