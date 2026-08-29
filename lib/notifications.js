/**
 * SIH 2026 In-App Notification Helper
 * File: lib/notifications.js
 */

const { getNotifications, saveNotifications } = require("./db");

function getUserNotifications(userId) {
  const notifications = getNotifications();
  return notifications.filter(n => n.userId === userId || n.userId === "all");
}

function markNotificationAsRead(notificationId) {
  const notifications = getNotifications();
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index !== -1) {
    notifications[index].read = true;
    saveNotifications(notifications);
    return notifications[index];
  }
  return null;
}

module.exports = {
  getUserNotifications,
  markNotificationAsRead
};
