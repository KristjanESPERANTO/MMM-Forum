const cheerio = require('cheerio')
const Log = require('logger')
const NodeHelper = require('node_helper')

module.exports = NodeHelper.create({

  async socketNotificationReceived(notification, payload) {
    switch (notification) {
      case 'MMM-FORUM-LOGIN':
        this.config = payload
        await this.loginAndFetchData()
        break
    }
  },

  async login() {
    const loginPageResponse = await fetch(`${this.config.baseUrl}login`)
    const loginPageHtml = await loginPageResponse.text()
    const cheerioInstance = cheerio.load(loginPageHtml)
    const csrfToken = cheerioInstance('input[name="_csrf"]').val()
    const loginResponse = await fetch(`${this.config.baseUrl}login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': loginPageResponse.headers.get('set-cookie'),
      },
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password,
        _csrf: csrfToken,
      }),
    })
    this.loginSetCookieHeader = loginResponse.headers.get('set-cookie')
  },

  async loginAndFetchData() {
    Log.debug(`[${this.name}] Trying to log in and retrieve session cookie.`)
    try {
      await this.login()
    }
    catch (error) {
      Log.error(`[${this.name}] Error while logging in and retrieving session cookie: ${error}`)
      this.sendSocketNotification('MMM-FORUM_ERROR')
      return
    }

    if (this.loginSetCookieHeader) {
      Log.debug(`[${this.name}] Successfully logged in and retrieved session cookie.`)

      // Initial fetch
      await this.fetchData()

      // Set interval for subsequent fetches
      clearInterval(this.fetchInterval)
      this.fetchInterval = setInterval(() => this.fetchData(), this.config.apiRequestInterval)
    }
    else {
      Log.error(`[${this.name}] Error while getting session cookie.`)
      this.sendSocketNotification('MMM-FORUM_ERROR')
    }
  },

  async fetchData() {
    if (this.config.maxUnreadTopics > 0) {
      await this.getUnreadTopics()
    }

    if (this.config.maxUnreadNotifications > 0) {
      await this.getUnreadNotifications()
    }

    if (this.config.maxUnreadMessages > 0) {
      await this.getUnreadMessages()
    }
  },

  async fetchApi(path) {
    const request = () => fetch(`${this.config.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        Cookie: this.loginSetCookieHeader,
      },
    })

    const response = await request()
    if (response.status !== 401 && response.status !== 403) {
      return response
    }

    // Retry only once so invalid credentials cannot cause a login loop.
    Log.debug(`[${this.name}] Session rejected, logging in again.`)
    await this.login()
    return request()
  },

  async fetchAndNotify({ label, path, property, notification }) {
    Log.debug(`[${this.name}] Fetching unread ${label}.`)
    try {
      const apiResponse = await this.fetchApi(path)
      const data = await apiResponse.json()

      if (!data || !data[property]) {
        Log.error(`[${this.name}] Error while fetching unread ${label}: ${apiResponse.statusText}`)
        this.sendSocketNotification('MMM-FORUM_ERROR')
      }
      else {
        Log.debug(`[${this.name}] Successfully fetched unread ${label}.`)
        this.sendSocketNotification(notification, data[property])
      }
    }
    catch (error) {
      Log.error(`[${this.name}] Error while fetching unread ${label}: ${error}`)
      this.sendSocketNotification('MMM-FORUM_ERROR')
    }
  },

  getUnreadTopics() {
    return this.fetchAndNotify({
      label: 'topics',
      path: 'api/unread',
      property: 'topics',
      notification: 'MMM-FORUM_UNREAD_TOPICS',
    })
  },

  getUnreadNotifications() {
    return this.fetchAndNotify({
      label: 'notifications',
      path: 'api/notifications',
      property: 'notifications',
      notification: 'MMM-FORUM_UNREAD_NOTIFICATIONS',
    })
  },

  getUnreadMessages() {
    return this.fetchAndNotify({
      label: 'messages',
      path: `api/user/${this.config.username.toLowerCase()}/chats`,
      property: 'rooms',
      notification: 'MMM-FORUM_UNREAD_MESSAGES',
    })
  },
})
