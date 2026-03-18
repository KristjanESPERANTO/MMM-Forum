/* global config Log Module */

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

  getTranslations () {
    return {
      de: "translations/de.json",
      en: "translations/en.json"
    };
  },

  async start () {
    if (this.config.apiRequestInterval < 3 * 60 * 1000) {
      Log.warn("[MMM-Forum] API request interval is too low. Setting it to 3 minutes.");
      this.config.apiRequestInterval = 3 * 60 * 1000;
    }

    await this.sendSocketNotification("MMM-FORUM-LOGIN", this.config);

    // Update DOM every 60 seconds to update the relative time indicators
    setInterval(async () => await this.updateDom(), 60 * 1000);
  },

  getRelativeTimeFormatter () {
    if (!this.relativeTimeFormatter) {
      try {
        this.relativeTimeFormatter = new Intl.RelativeTimeFormat(config.language || "en", {
          numeric: "auto"
        });
      } catch {
        this.relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
          numeric: "auto"
        });
      }
    }

    return this.relativeTimeFormatter;
  },

  getRelativeTimeText (dateInput) {
    const date = dateInput instanceof Date
      ? dateInput
      : new Date(dateInput);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const differenceInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    const absSeconds = Math.abs(differenceInSeconds);
    const formatter = this.getRelativeTimeFormatter();

    if (absSeconds < 60) {
      return formatter.format(differenceInSeconds, "second");
    }

    const differenceInMinutes = Math.round(differenceInSeconds / 60);
    if (Math.abs(differenceInMinutes) < 60) {
      return formatter.format(differenceInMinutes, "minute");
    }

    const differenceInHours = Math.round(differenceInMinutes / 60);
    if (Math.abs(differenceInHours) < 24) {
      return formatter.format(differenceInHours, "hour");
    }

    const differenceInDays = Math.round(differenceInHours / 24);
    if (Math.abs(differenceInDays) < 7) {
      return formatter.format(differenceInDays, "day");
    }

    const differenceInWeeks = Math.round(differenceInDays / 7);
    if (Math.abs(differenceInWeeks) < 4) {
      return formatter.format(differenceInWeeks, "week");
    }

    const differenceInMonths = Math.round(differenceInDays / 30);
    if (Math.abs(differenceInMonths) < 12) {
      return formatter.format(differenceInMonths, "month");
    }

    const differenceInYears = Math.round(differenceInDays / 365);
    return formatter.format(differenceInYears, "year");
  },

  parseTimestampCandidate (candidate) {
    if (candidate === null || candidate === "") {
      return null;
    }

    if (candidate instanceof Date) {
      if (Number.isNaN(candidate.getTime())) {
        return null;
      }

      return candidate;
    }

    const parseNumericTimestamp = (value) => {
      if (!Number.isFinite(value)) {
        return null;
      }

      // Heuristic: treat sub-1e11 values as seconds and convert to milliseconds.
      let timestampInMs = value;
      if (Math.abs(value) < 1e11) {
        timestampInMs = value * 1000;
      }

      const parsedDate = new Date(timestampInMs);
      if (Number.isNaN(parsedDate.getTime())) {
        return null;
      }

      return parsedDate;
    };

    if (typeof candidate === "number") {
      return parseNumericTimestamp(candidate);
    }

    if (typeof candidate === "string") {
      const trimmedCandidate = candidate.trim();
      if (trimmedCandidate === "") {
        return null;
      }

      const numericValue = Number(trimmedCandidate);
      if (!Number.isNaN(numericValue)) {
        const numericDate = parseNumericTimestamp(numericValue);
        if (numericDate) {
          return numericDate;
        }
      }

      const parsedDate = new Date(trimmedCandidate);
      if (Number.isNaN(parsedDate.getTime())) {
        return null;
      }

      return parsedDate;
    }

    return null;
  },

  getRelativeTimeFromCandidates (candidates) {
    for (const candidate of candidates) {
      const parsedDate = this.parseTimestampCandidate(candidate);
      if (parsedDate) {
        const relativeTimeText = this.getRelativeTimeText(parsedDate);
        if (relativeTimeText) {
          return relativeTimeText;
        }
      }
    }

    return "";
  },

  createSectionHeader (iconClass, label, count) {
    const sectionHeader = document.createElement("header");
    const icon = document.createElement("i");
    icon.classList.add("fa", iconClass);
    sectionHeader.appendChild(icon);
    sectionHeader.appendChild(document.createTextNode(` ${label} `));
    const badge = document.createElement("span");
    badge.classList.add("badge");
    badge.textContent = count;
    sectionHeader.appendChild(badge);
    return sectionHeader;
  },

  createMetaSpan (iconClass, text) {
    const span = document.createElement("span");
    const icon = document.createElement("i");
    icon.classList.add("fa", iconClass);
    span.appendChild(icon);
    span.appendChild(document.createTextNode(` ${text}`));
    return span;
  },

  getPlainText (htmlContent) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent ?? "";
    return (tempDiv.textContent || "").trim();
  },

  getTranslatedChatTitle (chatTitle) {
    const plainTitle = this.getPlainText(chatTitle);
    const chatWithPrefix = "Chat with ";

    if (plainTitle.startsWith(chatWithPrefix)) {
      const user = plainTitle.substring(chatWithPrefix.length).trim();
      if (user) {
        return this.translate("CHAT_WITH", {user});
      }
    }

    return plainTitle;
  },

  socketNotificationReceived (notification, payload) {
    switch (notification) {
      case "MMM-FORUM_UNREAD_TOPICS": {
        this.lastApiCall = Date.now();
        this.unreadTopicsContainer = document.createElement("div");
        this.unreadTopicsContainer.classList.add("section");
        this.unreadTopicsContainer.appendChild(this.createSectionHeader("fa-comments", this.translate("UNREAD_TOPICS"), payload.length));

        if (this.config.maxUnreadTopics < payload.length) {
          const note = document.createElement("div");
          note.classList.add("xsmall", "dimmed", "truncation-note");
          note.textContent = this.translate("SHOWING_OF", {
            shown: this.config.maxUnreadTopics,
            total: payload.length
          });
          this.unreadTopicsContainer.appendChild(note);
        }

        payload.slice(0, this.config.maxUnreadTopics).forEach((topic) => {
          const entry = document.createElement("div");
          entry.classList.add("entry");

          const title = document.createElement("div");
          title.classList.add("entry-title", "small", "light");
          title.textContent = this.getPlainText(topic.title);
          if (topic.isSolved) {
            title.classList.add("solved");
          }
          entry.appendChild(title);

          const meta = document.createElement("div");
          meta.classList.add("entry-meta", "xsmall", "dimmed");
          meta.appendChild(this.createMetaSpan("fa-user", topic.user.username));
          meta.appendChild(this.createMetaSpan("fa-folder-o", topic.category.name));
          meta.appendChild(this.createMetaSpan("fa-clock-o", this.getRelativeTimeText(new Date(topic.lastposttimeISO))));
          entry.appendChild(meta);

          this.unreadTopicsContainer.appendChild(entry);
        });

        this.updateDom();
        break;
      }
      case "MMM-FORUM_UNREAD_NOTIFICATIONS": {
        const unreadNotifications = payload.filter((notif) => !notif.read);

        this.lastApiCall = Date.now();
        this.unreadNotificationsContainer = document.createElement("div");
        this.unreadNotificationsContainer.classList.add("section");
        this.unreadNotificationsContainer.appendChild(this.createSectionHeader("fa-bell", this.translate("UNREAD_NOTIFICATIONS"), unreadNotifications.length));

        if (this.config.maxUnreadNotifications < unreadNotifications.length) {
          const note = document.createElement("div");
          note.classList.add("xsmall", "dimmed", "truncation-note");
          note.textContent = this.translate("SHOWING_OF", {
            shown: this.config.maxUnreadNotifications,
            total: unreadNotifications.length
          });
          this.unreadNotificationsContainer.appendChild(note);
        }

        unreadNotifications.slice(0, this.config.maxUnreadNotifications).forEach((unreadNotification) => {
          const entry = document.createElement("div");
          entry.classList.add("entry");

          const title = document.createElement("div");
          title.classList.add("entry-title", "small", "light");
          title.textContent = this.getPlainText(unreadNotification.topicTitle);
          if (unreadNotification.isSolved) {
            title.classList.add("solved");
          }
          entry.appendChild(title);

          const meta = document.createElement("div");
          meta.classList.add("entry-meta", "xsmall", "dimmed");
          meta.appendChild(this.createMetaSpan("fa-user", unreadNotification.user.username));
          meta.appendChild(this.createMetaSpan("fa-clock-o", this.getRelativeTimeText(new Date(unreadNotification.datetimeISO))));
          entry.appendChild(meta);

          this.unreadNotificationsContainer.appendChild(entry);
        });

        this.updateDom();
        break;
      }
      case "MMM-FORUM_UNREAD_MESSAGES": {
        const unreadMessages = payload.filter((notif) => !notif.read);

        this.lastApiCall = Date.now();
        this.unreadMessagesContainer = document.createElement("div");
        this.unreadMessagesContainer.classList.add("section");
        this.unreadMessagesContainer.appendChild(this.createSectionHeader("fa-envelope", this.translate("UNREAD_MESSAGES"), payload.length));

        if (this.config.maxUnreadMessages < unreadMessages.length) {
          const note = document.createElement("div");
          note.classList.add("xsmall", "dimmed", "truncation-note");
          note.textContent = this.translate("SHOWING_OF", {
            shown: this.config.maxUnreadMessages,
            total: unreadMessages.length
          });
          this.unreadMessagesContainer.appendChild(note);
        }

        unreadMessages.slice(0, this.config.maxUnreadMessages).forEach((room) => {
          const entry = document.createElement("div");
          entry.classList.add("entry");

          const title = document.createElement("div");
          title.classList.add("entry-title", "small", "light");
          title.textContent = this.getTranslatedChatTitle(room.chatWithMessage);
          entry.appendChild(title);

          if (room.teaser && room.teaser.content) {
            const teaser = document.createElement("div");
            teaser.classList.add("teaser", "xsmall", "dimmed");
            const teaserText = this.getPlainText(room.teaser.content);
            teaser.textContent = teaserText.length > 50
              ? `${teaserText.substring(0, 50)}…`
              : teaserText;
            entry.appendChild(teaser);
          }

          const meta = document.createElement("div");
          meta.classList.add("entry-meta", "xsmall", "dimmed");
          const messageTimeText = this.getRelativeTimeFromCandidates([
            room.lastposttimeISO,
            room.lastposttime,
            room.timestampISO,
            room.timestamp,
            room.datetimeISO,
            room.datetime,
            room.lastMessageTimestampISO,
            room.lastMessageTimestamp,
            room.teaser?.timestampISO,
            room.teaser?.timestamp,
            room.teaser?.datetimeISO,
            room.teaser?.datetime
          ]);
          if (messageTimeText) {
            meta.appendChild(this.createMetaSpan("fa-clock-o", messageTimeText));
          }
          entry.appendChild(meta);

          this.unreadMessagesContainer.appendChild(entry);
        });

        this.updateDom();
        break;
      }
      case "MMM-FORUM_ERROR": {
        this.errorContainer = document.createElement("div");
        this.errorContainer.classList.add("small", "dimmed");
        this.errorContainer.textContent = this.translate("ERROR_FETCHING_FORUM_DATA");
        this.updateDom();
        break;
      }
    }
  },

  getDom () {
    const wrapper = document.createElement("div");
    if (this.config.displayLastApiCall && this.lastApiCall) {
      const statusLine = document.createElement("div");
      statusLine.classList.add("status-line", "xsmall", "dimmed");
      const refreshIcon = document.createElement("i");
      refreshIcon.classList.add("fa", "fa-refresh");
      statusLine.appendChild(refreshIcon);
      statusLine.appendChild(document.createTextNode(` ${this.getRelativeTimeText(this.lastApiCall)}`));
      wrapper.appendChild(statusLine);
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
