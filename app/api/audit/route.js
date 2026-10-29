import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dataDirectory = path.join(process.cwd(), "data");
const auditFile = path.join(dataDirectory, "audit.json");

async function readAuditLogs() {
    await fs.mkdir(dataDirectory, { recursive: true });

    try {
        const content = await fs.readFile(auditFile, "utf8");
        const data = JSON.parse(content);

        if (!Array.isArray(data)) {
            throw new Error("Audit data must be an array.");
        }

        return data;
    } catch (error) {
        if (error.code === "ENOENT") {
            await fs.writeFile(auditFile, "[]", "utf8");
            return [];
        }

        throw error;
    }
}

async function writeAuditLogs(logs) {
    await fs.mkdir(dataDirectory, { recursive: true });

    await fs.writeFile(
        auditFile,
        JSON.stringify(logs, null, 2),
        "utf8"
    );
}

// GET: Retrieve all audit entries.
export async function GET() {
    try {
        const logs = await readAuditLogs();

        logs.sort(
            (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
        );

        return NextResponse.json(logs);
    } catch (error) {
        console.error("GET audit log error:", error);

        return NextResponse.json(
            { message: "Unable to load audit logs." },
            { status: 500 }
        );
    }
}

// DELETE: Delete one entry or clear all audit history.
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const clearAll = searchParams.get("clear") === "all";

        if (!id && !clearAll) {
            return NextResponse.json(
                {
                    message:
                        "Provide an entry ID or clear=all to delete history.",
                },
                { status: 400 }
            );
        }

        const logs = await readAuditLogs();

        // Clear all audit entries.
        if (clearAll) {
            const deletedCount = logs.length;

            await writeAuditLogs([]);

            return NextResponse.json({
                message: "Audit history cleared successfully.",
                deletedCount,
            });
        }

        // Delete one audit entry.
        const updatedLogs = logs.filter((entry) => entry.id !== id);

        if (updatedLogs.length === logs.length) {
            return NextResponse.json(
                { message: "Audit entry not found." },
                { status: 404 }
            );
        }

        await writeAuditLogs(updatedLogs);

        return NextResponse.json({
            message: "Audit entry deleted successfully.",
            deletedId: id,
        });
    } catch (error) {
        console.error("DELETE audit log error:", error);

        return NextResponse.json(
            { message: "Unable to delete audit history." },
            { status: 500 }
        );
    }
}