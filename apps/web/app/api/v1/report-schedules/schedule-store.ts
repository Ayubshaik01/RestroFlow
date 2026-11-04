import { createAdminClient } from "@/lib/supabase/admin";

export interface ScheduleRecord {
  id: string;
  branchId: string;
  reportKey: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  format: string;
  recipients: string[];
  isActive: boolean;
  lastSentAt: string | null;
  lastError: string | null;
  createdAt: string;
}

// In-memory fallback if Supabase table is not migrated yet
const memorySchedules: Map<string, ScheduleRecord> = new Map([
  [
    "sched-default-1",
    {
      id: "sched-default-1",
      branchId: "demo-branch",
      reportKey: "sales-daily",
      frequency: "DAILY",
      format: "xlsx",
      recipients: ["management@restroflow.com"],
      isActive: true,
      lastSentAt: new Date(Date.now() - 86400000).toISOString(),
      lastError: null,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
  ],
  [
    "sched-default-2",
    {
      id: "sched-default-2",
      branchId: "demo-branch",
      reportKey: "tax",
      frequency: "MONTHLY",
      format: "pdf",
      recipients: ["tax@restroflow.com", "ayubshaik01@restroflow.com"],
      isActive: true,
      lastSentAt: null,
      lastError: null,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  ],
]);

export async function getSchedulesForBranch(branchId: string): Promise<ScheduleRecord[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("report_schedules")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((r: any) => ({
        id: r.id,
        branchId: r.branch_id,
        reportKey: r.report_key,
        frequency: r.frequency,
        format: r.format,
        recipients: Array.isArray(r.recipients) ? r.recipients : JSON.parse(r.recipients || "[]"),
        isActive: Boolean(r.is_active),
        lastSentAt: r.last_sent_at,
        lastError: r.last_error,
        createdAt: r.created_at,
      }));
    }
  } catch {
    // fallback to memory
  }

  return Array.from(memorySchedules.values()).filter((s) => s.branchId === branchId);
}

export async function createSchedule(data: {
  branchId: string;
  reportKey: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  format: string;
  recipients: string[];
}): Promise<ScheduleRecord> {
  const newSched: ScheduleRecord = {
    id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    branchId: data.branchId,
    reportKey: data.reportKey,
    frequency: data.frequency,
    format: data.format,
    recipients: data.recipients,
    isActive: true,
    lastSentAt: null,
    lastError: null,
    createdAt: new Date().toISOString(),
  };

  try {
    const admin = createAdminClient();
    await admin.from("report_schedules").insert({
      id: newSched.id,
      branch_id: newSched.branchId,
      report_key: newSched.reportKey,
      frequency: newSched.frequency,
      format: newSched.format,
      recipients: newSched.recipients,
      is_active: true,
    });
  } catch {
    // use memory
  }

  memorySchedules.set(newSched.id, newSched);
  return newSched;
}

export async function updateScheduleStatus(id: string, isActive: boolean): Promise<boolean> {
  try {
    const admin = createAdminClient();
    await admin.from("report_schedules").update({ is_active: isActive }).eq("id", id);
  } catch {
    // ignore
  }

  const existing = memorySchedules.get(id);
  if (existing) {
    existing.isActive = isActive;
    memorySchedules.set(id, existing);
    return true;
  }
  return true;
}

export async function deleteSchedule(id: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    await admin.from("report_schedules").delete().eq("id", id);
  } catch {
    // ignore
  }

  memorySchedules.delete(id);
  return true;
}

export async function markScheduleSent(id: string, error?: string): Promise<void> {
  const now = new Date().toISOString();
  try {
    const admin = createAdminClient();
    await admin
      .from("report_schedules")
      .update({ last_sent_at: now, last_error: error || null })
      .eq("id", id);
  } catch {
    // ignore
  }

  const existing = memorySchedules.get(id);
  if (existing) {
    existing.lastSentAt = now;
    existing.lastError = error || null;
    memorySchedules.set(id, existing);
  }
}

