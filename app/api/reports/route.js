import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dataDirectory = path.join(process.cwd(), "data");
const reportsFile = path.join(dataDirectory, "reports.json");
const auditFile = path.join(dataDirectory, "audit.json");
const notificationsFile = path.join(dataDirectory, "notifications.json");

// Read JSON data. Create the file if it does not exist.
async function readJson(file) {
    try {
        const content = await fs.readFile(file, "utf8");
        const data = JSON.parse(content);

        return Array.isArray(data) ? data : [];
    } catch (error) {
        if (error.code === "ENOENT") {
            await fs.mkdir(dataDirectory, { recursive: true });
            await fs.writeFile(file, "[]", "utf8");
            return [];
        }

        throw error;
    }
}

// Save JSON data.
async function writeJson(file, data) {
    await fs.mkdir(dataDirectory, { recursive: true });

    await fs.writeFile(
        file,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

// Record actions in the audit log.
async function addAuditEntry(
    report,
    action,
    previousStatus,
    notes = ""
) {
    const logs = await readJson(auditFile);

    logs.push({
        id: randomUUID(),
        incidentId: report.id,
        incidentTitle: report.title,
        action,
        previousStatus,
        newStatus: report.status,
        reviewer: "Demo Reviewer",
        notes,
        timestamp: new Date().toISOString()
    });

    await writeJson(auditFile, logs);
}

// Create and save a notification.
async function createNotification({
    incidentId,
    incidentTitle,
    action,
    status
}) {
    const messages = {
        Verify: "Your incident report has been verified.",
        Reject: "Your incident report has been rejected.",
        Confirm: "Your incident report has been confirmed.",
        "Request Verification":
            "Your incident report requires further verification.",
        Resolve: "Your incident has been marked as resolved."
    };

    const message = messages[action];

    if (!message) {
        return null;
    }

    const notifications = await readJson(notificationsFile);

    const notification = {
        id: randomUUID(),
        incidentId,
        incidentTitle: incidentTitle || "Untitled incident",
        action,
        status,
        message,
        read: false,
        createdAt: new Date().toISOString()
    };

    notifications.push(notification);

    await writeJson(notificationsFile, notifications);

    return notification;
}

// Create a notification when an incident's status changes.
async function notifyStatusChange(report, action, previousStatus) {
    if (previousStatus === report.status) {
        return;
    }

    try {
        await createNotification({
            incidentId: report.id,
            incidentTitle: report.title,
            action,
            status: report.status
        });
    } catch (error) {
        console.error("Notification creation error:", error);
    }
}

// GET: Retrieve all incident reports.
export async function GET() {
    try {
        const reports = await readJson(reportsFile);
        return NextResponse.json(reports);
    } catch (error) {
        console.error("GET reports error:", error);

        return NextResponse.json(
            { message: "Unable to load reports." },
            { status: 500 }
        );
    }
}

// POST: Create a new incident report.
export async function POST(request) {
    try {
        const body = await request.json();

        const requiredFields = [
            "title",
            "category",
            "description",
            "location",
            "source",
            "observedAt"
        ];

        for (const field of requiredFields) {
            if (
                typeof body[field] !== "string" ||
                !body[field].trim()
            ) {
                return NextResponse.json(
                    {
                        message: "Please provide a valid " + field + "."
                    },
                    { status: 400 }
                );
            }
        }

        const reports = await readJson(reportsFile);
        const now = new Date().toISOString();

        const report = {
            id: randomUUID(),
            title: body.title.trim(),
            category: body.category.trim(),
            description: body.description.trim(),
            location: body.location.trim(),
            source: body.source.trim(),
            observedAt: body.observedAt.trim(),

            evidence:
                typeof body.evidence === "string"
                    ? body.evidence.trim()
                    : "",

            status: "Pending",
            priority: "Unassessed",
            flags: [],

            timeline: [
                {
                    action: "Report submitted",
                    notes: "Incident report received.",
                    timestamp: now
                }
            ],

            advisoryComparison: {
                status: "Not checked",
                notes: "No official advisory linked yet.",
                sourceUrl: ""
            },

            createdAt: now,
            updatedAt: now
        };

        reports.push(report);

        await writeJson(reportsFile, reports);

        await addAuditEntry(
            report,
            "Report submitted",
            "None",
            "New incident report created."
        );

        return NextResponse.json(
            {
                message: "Report saved successfully.",
                report
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST reports error:", error);

        return NextResponse.json(
            { message: "Unable to save the report." },
            { status: 500 }
        );
    }
}

// PATCH: Update an incident and record the action.
export async function PATCH(request) {
    try {
        const body = await request.json();

        const id = body.id;
        const action = body.action;

        const notes =
            typeof body.notes === "string"
                ? body.notes
                : "";

        if (typeof id !== "string" || !id.trim()) {
            return NextResponse.json(
                { message: "A valid incident ID is required." },
                { status: 400 }
            );
        }

        const allowedActions = [
            "Verify",
            "Reject",
            "Confirm",
            "Request Verification",
            "Resolve",
            "Add Flag",
            "Dismiss Flag",
            "Update Advisory",
            "Merge",
            "Split"
        ];

        if (!allowedActions.includes(action)) {
            return NextResponse.json(
                { message: "Invalid incident action." },
                { status: 400 }
            );
        }

        const reports = await readJson(reportsFile);

        const index = reports.findIndex(function (item) {
            return item.id === id;
        });

        if (index === -1) {
            return NextResponse.json(
                { message: "Incident not found." },
                { status: 404 }
            );
        }

        const report = reports[index];
        const previousStatus = report.status;

        const statusMap = {
            Verify: "Verified",
            Reject: "Rejected",
            Confirm: "Confirmed",
            "Request Verification": "Verification Requested",
            Resolve: "Resolved"
        };

        if (statusMap[action]) {
            report.status = statusMap[action];
        }

        // Add a flag.
        if (action === "Add Flag") {
            if (
                typeof body.flag !== "string" ||
                !body.flag.trim()
            ) {
                return NextResponse.json(
                    { message: "Enter a flag description." },
                    { status: 400 }
                );
            }

            if (!Array.isArray(report.flags)) {
                report.flags = [];
            }

            report.flags.push({
                id: randomUUID(),
                text: body.flag.trim(),
                dismissed: false,
                createdAt: new Date().toISOString()
            });
        }

        // Dismiss an existing flag.
        if (action === "Dismiss Flag") {
            const flags = Array.isArray(report.flags)
                ? report.flags
                : [];

            const flag = flags.find(function (item) {
                return item.id === body.flagId;
            });

            if (!flag) {
                return NextResponse.json(
                    { message: "Flag not found." },
                    { status: 404 }
                );
            }

            flag.dismissed = true;
            flag.dismissedAt = new Date().toISOString();
            flag.dismissalNotes = notes;
        }

        // Update advisory details.
        if (action === "Update Advisory") {
            report.advisoryComparison = {
                status: String(body.advisoryStatus || "Not checked"),
                notes: String(body.advisoryNotes || ""),
                sourceUrl: String(body.sourceUrl || ""),
                updatedAt: new Date().toISOString()
            };
        }

        // Merge another incident into this incident.
        if (action === "Merge") {
            const other = reports.find(function (item) {
                return item.id === body.otherId && item.id !== id;
            });

            if (!other) {
                return NextResponse.json(
                    { message: "Select another valid incident." },
                    { status: 400 }
                );
            }

            if (other.mergedInto) {
                return NextResponse.json(
                    {
                        message: "This incident has already been merged."
                    },
                    { status: 400 }
                );
            }

            if (!Array.isArray(report.relatedIncidents)) {
                report.relatedIncidents = [];
            }

            if (!report.relatedIncidents.includes(other.id)) {
                report.relatedIncidents.push(other.id);
            }

            const otherPreviousStatus = other.status;

            other.mergedInto = report.id;
            other.status = "Merged";
            other.updatedAt = new Date().toISOString();

            await addAuditEntry(
                other,
                "Merged into another incident",
                otherPreviousStatus,
                "Merged into incident " + report.id
            );
        }

        // Mark for separate investigation.
        if (action === "Split") {
            report.splitNote =
                notes || "Marked for separate investigation.";

            report.status = "Split for Review";
        }

        // Record the action in the incident timeline.
        if (!Array.isArray(report.timeline)) {
            report.timeline = [];
        }

        const actionTimestamp = new Date().toISOString();

        report.timeline.push({
            action,
            notes,
            timestamp: actionTimestamp
        });

        report.updatedAt = actionTimestamp;
        reports[index] = report;

        await writeJson(reportsFile, reports);

        await addAuditEntry(
            report,
            action,
            previousStatus,
            notes
        );

        // Notify when a review action changes the status.
        if (statusMap[action]) {
            await notifyStatusChange(
                report,
                action,
                previousStatus
            );
        }

        return NextResponse.json({
            message: "Action recorded successfully.",
            report
        });
    } catch (error) {
        console.error("PATCH reports error:", error);

        return NextResponse.json(
            { message: "Unable to update the incident." },
            { status: 500 }
        );
    }
}

// DELETE: Remove one report and record the deletion.
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id || !id.trim()) {
            return NextResponse.json(
                { message: "A valid incident ID is required." },
                { status: 400 }
            );
        }

        const reports = await readJson(reportsFile);

        const index = reports.findIndex(function (item) {
            return item.id === id;
        });

        if (index === -1) {
            return NextResponse.json(
                { message: "Report not found." },
                { status: 404 }
            );
        }

        const report = reports[index];
        const auditLogs = await readJson(auditFile);

        auditLogs.push({
            id: randomUUID(),
            incidentId: report.id,
            incidentTitle: report.title,
            action: "Report deleted",
            previousStatus: report.status || "Unknown",
            newStatus: "Deleted",
            reviewer: "Demo Reviewer",
            notes: "Report deleted from the Reports dashboard.",
            timestamp: new Date().toISOString()
        });

        await writeJson(auditFile, auditLogs);

        reports.splice(index, 1);

        await writeJson(reportsFile, reports);

        return NextResponse.json({
            message: "Report deleted successfully.",
            deletedId: id
        });
    } catch (error) {
        console.error("DELETE report error:", error);

        return NextResponse.json(
            { message: "Unable to delete the report." },
            { status: 500 }
        );
    }
}