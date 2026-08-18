import { openDB } from "idb";

const DB_NAME = "attendease_offline";
const STORE = "checkin_queue";

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

export async function queueCheckin(payload) {
  const db = await getDB();
  await db.add(STORE, { ...payload, queuedAt: Date.now() });
}

export async function getPendingCheckins() {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function removePendingCheckin(id) {
  const db = await getDB();
  await db.delete(STORE, id);
}

export async function flushQueue(apiFn) {
  const pending = await getPendingCheckins();
  const results = [];
  for (const item of pending) {
    try {
      await apiFn(item);
      await removePendingCheckin(item.id);
      results.push({ success: true, item });
    } catch {
      results.push({ success: false, item });
    }
  }
  return results;
}
