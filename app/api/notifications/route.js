import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const notificationsFile = path.join(
    process.cwd(),
    "data",
    "notifications.json"
);

async function readNotifications() {
    try {
        const content = await fs.readFile(notificationsFile, "utf8");
        const notifications = JSON.parse(content);

        return Array.isArray(notifications) ? notifications : [];
    } catch (error) {
        if (error.code === "ENOENT") {
            await fs.mkdir(path.dirname(notificationsFile), {
                recursive: true,
            });

            await fs.writeFile(
                notificationsFile,
                JSON.stringify([], null, 2),
                "utf8"
            );

            return [];
        }

        throw error;
    }
}

async function saveNotifications(notifications) {
    await fs.mkdir(path.dirname(notificationsFile), {
        recursive: true,
    });

    await fs.writeFile(
        notificationsFile,
        JSON.stringify(notifications, null, 2),
        "utf8"
    );
}

export async function GET() {
    try {
        const notifications = await readNotifications();

        notifications.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
        );

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);

        return NextResponse.json(
            { message: "Failed to fetch notifications." },
            { status: 500 }
        );
    }
}

export async function PATCH(request) {
    try {
        const body = await request.json();
        const notifications = await readNotifications();

        if (body.action === "markAllRead") {
            notifications.forEach((notification) => {
                notification.read = true;
            });
        } else if (body.id) {
            const notification = notifications.find(
                (item) => item.id === body.id
            );

            if (!notification) {
                return NextResponse.json(
                    { message: "Notification not found." },
                    { status: 404 }
                );
            }

            notification.read = true;
        } else {
            return NextResponse.json(
                { message: "Invalid notification action." },
                { status: 400 }
            );
        }

        await saveNotifications(notifications);

        return NextResponse.json({
            message: "Notifications updated successfully.",
            notifications,
        });
    } catch (error) {
        console.error("Error updating notifications:", error);

        return NextResponse.json(
            { message: "Failed to update notifications." },
            { status: 500 }
        );
    }
}
