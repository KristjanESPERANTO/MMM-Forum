/* global config dayjs Log Module */

Module.register("MMM-Forum", {

  defaults: {
    username: "",
    password: "",
    baseUrl: "https://forum.magicmirror.builders/",
    apiRequestInterval: 5 * 60 * 1000,
    displayLastApiCall: true,
    maxUnreadTopics: 3,
    maxUnreadNotifications: 3,
    maxUnreadMessages: 3
  },

  getStyles () {
    return ["MMM-Forum.css"];
  },

  getScripts () {
    return [
      this.file("node_modules/dayjs/dayjs.min.js"),
      this.file("node_modules/dayjs/plugin/localizedFormat.js"),
      this.file("node_modules/dayjs/plugin/relativeTime.js"),
      this.file(`node_modules/dayjs/locale/${config.language}.js`)
    ];
  },

  async start () {
    if (this.config.apiRequestInterval < 3 * 60 * 1000) {
      Log.warn("[MMM-Forum] API request interval is too low. Setting it to 3 minutes.");
      this.config.apiRequestInterval = 3 * 60 * 1000;
    }

    dayjs.locale(config.language);
    dayjs.extend(window.dayjs_plugin_relativeTime);
    await this.sendSocketNotification("MMM-FORUM-LOGIN", this.config);

    // Update DOM every 60 seconds to update the relative time indicators
    setInterval(async () => await this.updateDom(), 60 * 1000);
  },

  socketNotificationReceived (notification, payload) {
    switch (notification) {
      case "MMM-FORUM_UNREAD_TOPICS": {
        this.lastApiCall = Date.now();
        this.unreadTopicsContainer = document.createElement("div");
        const unreadTopicsHeader = document.createElement("div");
        unreadTopicsHeader.classList.add("header", "topics-header");
        unreadTopicsHeader.innerHTML = `Unread topics: ${payload.length}`;
        if (this.config.maxUnreadTopics < payload.length) {
          unreadTopicsHeader.innerHTML = `Last ${this.config.maxUnreadTopics} unread topics. Total: ${payload.length}`;
        }
        this.unreadTopicsContainer.appendChild(unreadTopicsHeader);

        const unreadTopicsData = document.createElement("div");

        payload.slice(0, this.config.maxUnreadTopics).forEach((topic) => {
          const topicContainer = document.createElement("div");
          const topicTitle = document.createElement("div");
          topicTitle.innerHTML = topic.title;
          topicTitle.classList.add("title");
          const topicInfo = document.createElement("div");
          topicInfo.classList.add("info");
          const topicUser = document.createElement("div");
          topicUser.innerHTML = topic.user.username;
          topicUser.classList.add("user");
          const topicCategory = document.createElement("div");
          topicCategory.innerHTML = topic.category.name;
          topicCategory.classList.add("category");
          const topicTime = document.createElement("div");
          const time = new Date(topic.lastposttimeISO);
          const timeAgo = dayjs(time).fromNow();
          topicTime.innerHTML = timeAgo;
          topicTime.classList.add("time");

          if (topic.isSolved) {
            topicTitle.classList.add("solved", "fa", "fa-check");
            topicTitle.innerHTML = `SOLVED - ${topicTitle.innerHTML}`;
          } else {
            topicTitle.classList.add("unsolved");
          }

          topicContainer.appendChild(topicTitle);
          topicInfo.appendChild(topicUser);
          topicInfo.appendChild(topicCategory);
          topicInfo.appendChild(topicTime);
          topicContainer.appendChild(topicInfo);

          unreadTopicsData.appendChild(topicContainer);
        });
        this.unreadTopicsContainer.appendChild(unreadTopicsData);

        this.updateDom();
        break;
      }
      case "MMM-FORUM_UNREAD_NOTIFICATIONS": {
        const unreadNotifications = payload.filter((notif) => !notif.read);

        this.lastApiCall = Date.now();
        this.unreadNotificationsContainer = document.createElement("div");
        const unreadNotificationsHeader = document.createElement("div");
        unreadNotificationsHeader.classList.add("header", "notifications-header");
        unreadNotificationsHeader.innerHTML = `Unread notifications: ${unreadNotifications.length}`;
        if (this.config.maxUnreadNotifications < unreadNotifications.length) {
          unreadNotificationsHeader.innerHTML = `Last ${this.config.maxUnreadNotifications} unread notifications. Total: ${unreadNotifications.length}`;
        }
        this.unreadNotificationsContainer.appendChild(unreadNotificationsHeader);

        const unreadNotificationsData = document.createElement("div");

        unreadNotifications.slice(0, this.config.maxUnreadNotifications).forEach((unreadNotification) => {
          const topicNotification = document.createElement("div");
          const topicTitle = document.createElement("div");
          topicTitle.innerHTML = unreadNotification.topicTitle;
          topicTitle.classList.add("topic-title");
          const topicInfo = document.createElement("div");
          topicInfo.classList.add("info");
          const topicUser = document.createElement("div");
          topicUser.innerHTML = unreadNotification.user.username;
          topicUser.classList.add("user");
          const topicTime = document.createElement("div");
          const time = new Date(unreadNotification.datetimeISO);
          const timeAgo = dayjs(time).fromNow();
          topicTime.innerHTML = timeAgo;
          topicTime.classList.add("time");

          if (unreadNotification.isSolved) {
            topicTitle.classList.add("solved", "fa", "fa-check");
            topicTitle.innerHTML = `SOLVED - ${topicTitle.innerHTML}`;
          } else {
            topicTitle.classList.add("unsolved");
          }

          topicNotification.appendChild(topicTitle);
          topicInfo.appendChild(topicUser);
          topicInfo.appendChild(topicTime);
          topicNotification.appendChild(topicInfo);

          unreadNotificationsData.appendChild(topicNotification);
        });
        this.unreadNotificationsContainer.appendChild(unreadNotificationsData);

        this.updateDom();
        break;
      }
      case "MMM-FORUM_UNREAD_MESSAGES": {
        const unreadMessages = payload.filter((notif) => !notif.read);

        this.lastApiCall = Date.now();
        this.unreadMessagesContainer = document.createElement("div");
        const unreadMessagesHeader = document.createElement("div");
        unreadMessagesHeader.classList.add("header", "messages-header");
        unreadMessagesHeader.innerHTML = `Unread messages: ${payload.length}`;
        if (this.config.maxUnreadMessages < unreadMessages.length) {
          unreadMessagesHeader.innerHTML = `Last ${this.config.maxUnreadMessages} unread messages. Total: ${unreadMessages.length}`;
        }
        this.unreadMessagesContainer.appendChild(unreadMessagesHeader);

        const unreadMessagesData = document.createElement("div");

        unreadMessages.slice(0, this.config.maxUnreadMessages).forEach((room) => {
          const messageContainer = document.createElement("div");
          const tempHtml = room.chatWithMessage;
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = tempHtml;
          const messageTitle = document.createElement("div");
          messageTitle.textContent = tempDiv.textContent;
          messageTitle.classList.add("title");
          const messageInfo = document.createElement("div");
          messageInfo.classList.add("info");
          const messageTeaser = document.createElement("div");
          if (room.teaser && room.teaser.content) {
            messageTeaser.textContent = room.teaser.content.length > 50
              ? `${room.teaser.content.substring(0, 50)}...`
              : room.teaser.content;
          } else {
            messageTeaser.textContent = "No content";
          }

          messageTeaser.classList.add("teaser");
          const messageTime = document.createElement("div");
          const time = new Date(room.lastposttimeISO);
          const timeAgo = dayjs(time).fromNow();
          messageTime.textContent = timeAgo;
          messageTime.classList.add("message-time");

          messageContainer.appendChild(messageTitle);
          messageContainer.appendChild(messageTeaser);
          messageInfo.appendChild(messageTime);
          messageContainer.appendChild(messageInfo);

          unreadMessagesData.appendChild(messageContainer);
        });
        this.unreadMessagesContainer.appendChild(unreadMessagesData);

        this.updateDom();
        break;
      }
      case "MMM-FORUM_ERROR": {
        this.errorContainer = document.createElement("div");
        this.errorContainer.classList.add("error");
        this.errorContainer.innerHTML = "Error fetching data from the forum!";
        this.updateDom();
        break;
      }
    }
  },

  getDom () {
    const wrapper = document.createElement("div");
    if (this.config.displayLastApiCall && this.lastApiCall) {
      const updateInfo = document.createElement("div");
      updateInfo.classList.add("update");
      updateInfo.textContent = `Last API request: ${dayjs(this.lastApiCall).fromNow()}`;
      wrapper.appendChild(updateInfo);
    }
    if (this.unreadTopicsContainer) {
      wrapper.appendChild(this.unreadTopicsContainer);
    }
    if (this.unreadNotificationsContainer) {
      wrapper.appendChild(this.unreadNotificationsContainer);
    }
    if (this.unreadMessagesContainer) {
      wrapper.appendChild(this.unreadMessagesContainer);
    }
    if (this.errorContainer) {
      wrapper.appendChild(this.errorContainer);
    }
    return wrapper;
  }
});
