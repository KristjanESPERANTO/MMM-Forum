const cheerio = require("cheerio");
const Log = require("logger");
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

  async socketNotificationReceived (notification, payload) {
    switch (notification) {
      case "MMM-FORUM-LOGIN":
        this.config = payload;
        await this.loginAndFetchData();
        break;
    }
  },

  async loginAndFetchData () {
    Log.debug(`[${this.name}] Trying to log in and retrieve session cookie.`);
    try {
      const loginPageResponse = await fetch(`${this.config.baseUrl}login`);
      const loginPageHtml = await loginPageResponse.text();
      const cheerioInstance = cheerio.load(loginPageHtml);
      const csrfToken = cheerioInstance("input[name=\"_csrf\"]").val();
      const loginResponse = await fetch(`${this.config.baseUrl}login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: loginPageResponse.headers.get("set-cookie")
        },
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password,
          _csrf: csrfToken
        })
      });
      this.loginSetCookieHeader = loginResponse.headers.get("set-cookie");
    } catch (error) {
      Log.error(`[${this.name}] Error while logging in and retrieving session cookie: ${error}`);
      this.sendSocketNotification("MMM-FORUM_ERROR");
      return;
    }

    if (this.loginSetCookieHeader) {
      Log.debug(`[${this.name}] Successfully logged in and retrieved session cookie.`);

      // Initial fetch
      await this.fetchData();

      // Set interval for subsequent fetches
      setInterval(() => this.fetchData(), this.config.apiRequestInterval);
    } else {
      Log.error(`[${this.name}] Error while getting session cookie.`);
      this.sendSocketNotification("MMM-FORUM_ERROR");
    }
  },

  async fetchData () {
    if (this.config.maxUnreadTopics > 0) {
      await this.getUnreadTopics();
    }

    if (this.config.maxUnreadNotifications > 0) {
      await this.getUnreadNotifications();
    }

    if (this.config.maxUnreadMessages > 0) {
      await this.getUnreadMessages();
    }
  },

  async getUnreadTopics () {
    Log.debug(`[${this.name}] Fetching unread topics.`);
    const apiResponse = await fetch(`${this.config.baseUrl}api/unread`, {
      method: "GET",
      headers: {
        Cookie: this.loginSetCookieHeader
      }
    });

    const data = await apiResponse.json();

    if (!data || !data.topics) {
      Log.error(`[${this.name}] Error while fetching unread topics: ${apiResponse.statusText}`);
      this.sendSocketNotification("MMM-FORUM_ERROR");
    } else {
      Log.debug(`[${this.name}] Successfully fetched unread topics.`);
      this.sendSocketNotification("MMM-FORUM_UNREAD_TOPICS", data.topics);
    }
  },

  async getUnreadNotifications () {
    Log.debug(`[${this.name}] Fetching unread notifications.`);
    const apiResponse = await fetch(`${this.config.baseUrl}api/notifications`, {
      method: "GET",
      headers: {
        Cookie: this.loginSetCookieHeader
      }
    });

    const data = await apiResponse.json();

    if (!data || !data.notifications) {
      Log.error(`[${this.name}] Error while fetching unread notifications: ${apiResponse.statusText}`);
      this.sendSocketNotification("MMM-FORUM_ERROR");
    } else {
      Log.debug(`[${this.name}] Successfully fetched unread notifications.`);
      this.sendSocketNotification("MMM-FORUM_UNREAD_NOTIFICATIONS", data.notifications);
    }
  },

  async getUnreadMessages () {
    Log.debug(`[${this.name}] Fetching unread messages.`);
    try {
      const apiResponse = await fetch(`${this.config.baseUrl}api/user/${this.config.username.toLowerCase()}/chats`, {
        method: "GET",
        headers: {
          Cookie: this.loginSetCookieHeader
        }
      });

      const data = await apiResponse.json();

      if (!data || !data.rooms) {
        Log.error(`[${this.name}] Error while fetching unread messages: ${apiResponse.statusText}`);
        this.sendSocketNotification("MMM-FORUM_ERROR");
      } else {
        Log.debug(`[${this.name}] Successfully fetched unread messages.`);
        this.sendSocketNotification("MMM-FORUM_UNREAD_MESSAGES", data.rooms);
      }
    } catch (error) {
      Log.error(`[${this.name}] Error while fetching unread messages: ${error}`);
      this.sendSocketNotification("MMM-FORUM_ERROR");
    }
  }
});
