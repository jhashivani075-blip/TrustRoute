"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchNotifications() {
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Could not load notifications.");
      }

      const data = await response.json();

      setNotifications(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      console.error("Notification error:", err);
      setError("Unable to load notifications.");
    }
  }

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 15000);

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  async function markAsRead(id) {
    setLoading(true);

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Could not mark notification as read.");
      }

      await fetchNotifications();
    } catch (err) {
      console.error(err);
      setError("Could not update notification.");
    } finally {
      setLoading(false);
    }
  }

  async function markAllAsRead() {
    setLoading(true);

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "markAllRead" }),
      });

      if (!response.ok) {
        throw new Error("Could not mark notifications as read.");
      }

      await fetchNotifications();
    } catch (err) {
      console.error(err);
      setError("Could not update notifications.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        style={styles.bellButton}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setIsOpen(false)}
            style={styles.backdrop}
          />

          <section style={styles.dropdown}>
            <div style={styles.header}>
              <div>
                <h3 style={styles.title}>Notifications</h3>
                <p style={styles.subtitle}>
                  {unreadCount} unread notification
                  {unreadCount === 1 ? "" : "s"}
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={loading}
                  style={styles.markAll}
                >
                  Mark all read
                </button>
              )}
            </div>

            {error && <p style={styles.error}>{error}</p>}

            {notifications.length === 0 && !error ? (
              <div style={styles.empty}>
                <span style={styles.emptyIcon}>🔔</span>
                <p style={styles.emptyTitle}>You&apos;re all caught up!</p>
                <p style={styles.emptyText}>
                  New incident updates will appear here.
                </p>
              </div>
            ) : (
              <div style={styles.list}>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      ...styles.item,
                      background: notification.read ? "#ffffff" : "#f0f5ff",
                    }}
                  >
                    <span
                      style={{
                        ...styles.statusDot,
                        background: notification.read ? "#cbd5e1" : "#1456d9",
                      }}
                    />

                    <div style={styles.itemContent}>
                      <p style={styles.message}>
                        {notification.message ||
                          `Incident status updated to ${notification.status || "updated"}.`}
                      </p>

                      {notification.incidentTitle && (
                        <p style={styles.incidentTitle}>
                          {notification.incidentTitle}
                        </p>
                      )}

                      <p style={styles.date}>
                        {notification.createdAt
                          ? new Date(notification.createdAt).toLocaleString()
                          : ""}
                      </p>

                      <div style={styles.actions}>
                        {notification.incidentId && (
                          <Link
                            href={`/incidents/${notification.incidentId}`}
                            onClick={() => setIsOpen(false)}
                            style={styles.viewLink}
                          >
                            View incident →
                          </Link>
                        )}

                        {!notification.read && (
                          <button
                            type="button"
                            onClick={() => markAsRead(notification.id)}
                            disabled={loading}
                            style={styles.readButton}
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
              }}
              style={styles.closeButton}
            >
              Close
            </button>
          </section>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
  },
  bellButton: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    border: "1px solid #e5eaf2",
    background: "#ffffff",
    color: "#344054",
    cursor: "pointer",
  },
  badge: {
    position: "absolute",
    top: "-5px",
    right: "-5px",
    minWidth: "19px",
    height: "19px",
    padding: "0 4px",
    boxSizing: "border-box",
    borderRadius: "20px",
    background: "#e53935",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #ffffff",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 40,
    background: "transparent",
    border: "none",
    cursor: "default",
  },
  dropdown: {
    position: "absolute",
    top: "52px",
    right: 0,
    width: "min(380px, calc(100vw - 32px))",
    maxHeight: "min(520px, 75vh)",
    overflowY: "auto",
    background: "#ffffff",
    border: "1px solid #e5eaf2",
    borderRadius: "14px",
    boxShadow: "0 15px 45px rgba(16, 24, 40, 0.18)",
    zIndex: 50,
    color: "#172033",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "18px",
    borderBottom: "1px solid #edf0f5",
  },
  title: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "800",
  },
  subtitle: {
    margin: "5px 0 0",
    fontSize: "12px",
    color: "#667085",
  },
  markAll: {
    border: "none",
    background: "transparent",
    color: "#1456d9",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  error: {
    padding: "12px 18px",
    color: "#b42318",
    fontSize: "13px",
  },
  empty: {
    padding: "35px 18px",
    textAlign: "center",
  },
  emptyIcon: {
    display: "block",
    fontSize: "30px",
    marginBottom: "10px",
  },
  emptyTitle: {
    margin: "0 0 6px",
    fontWeight: "700",
    fontSize: "14px",
  },
  emptyText: {
    margin: 0,
    color: "#667085",
    fontSize: "13px",
    lineHeight: "1.6",
  },
  list: {
    display: "flex",
    flexDirection: "column",
  },
  item: {
    display: "flex",
    gap: "10px",
    padding: "15px 16px",
    borderBottom: "1px solid #edf0f5",
  },
  statusDot: {
    flexShrink: 0,
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    marginTop: "6px",
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  message: {
    margin: 0,
    fontSize: "13px",
    lineHeight: "1.6",
    fontWeight: "600",
    overflowWrap: "anywhere",
  },
  incidentTitle: {
    margin: "5px 0 0",
    fontSize: "12px",
    color: "#475467",
    overflowWrap: "anywhere",
  },
  date: {
    margin: "7px 0 0",
    color: "#667085",
    fontSize: "11px",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginTop: "9px",
  },
  viewLink: {
    color: "#1456d9",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "700",
  },
  readButton: {
    padding: 0,
    border: "none",
    background: "transparent",
    color: "#475467",
    fontSize: "12px",
    cursor: "pointer",
  },
  closeButton: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderTop: "1px solid #edf0f5",
    background: "#ffffff",
    color: "#475467",
    fontWeight: "700",
    cursor: "pointer",
  },
};
