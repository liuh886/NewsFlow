import { createClient } from '@supabase/supabase-js';

const CONFIG_PATH = './data/supabase-config.json';
const OUTBOX_KEY = 'newsflow_supabase_outbox_v1';
const CLIENT_ID_KEY = 'newsflow_sync_client_id_v1';
const SYNC_SUSPENDED_KEY = 'newsflow_supabase_sync_suspended_v1';
const OUTBOX_OWNER_KEY = 'newsflow_supabase_outbox_owner_v1';
const status = (detail) => window.dispatchEvent(new CustomEvent('newsflow:sync-status', { detail }));
const remote = (rows) => window.dispatchEvent(new CustomEvent('newsflow:remote-feedback', { detail: { rows } }));
const readJson = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
};
const makeId = () => globalThis.crypto?.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : ((random & 0x3) | 0x8)).toString(16);
  });
const clientId = localStorage.getItem(CLIENT_ID_KEY) || makeId();
localStorage.setItem(CLIENT_ID_KEY, clientId);

let config = null;
let client = null;
let session = null;
let flushTimer = 0;
let syncing = false;
let outbox = readJson(OUTBOX_KEY, {});
let outboxOwner = localStorage.getItem(OUTBOX_OWNER_KEY) || 'anonymous';
let syncSuspended = false;
if (!outbox || typeof outbox !== 'object' || Array.isArray(outbox)) outbox = {};

const saveOutbox = () => localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
const suspensionKey = () => `${SYNC_SUSPENDED_KEY}:${session?.user?.id || 'anonymous'}`;
const bindOutbox = (userId) => {
  const nextOwner = userId || 'anonymous';
  if (outboxOwner !== nextOwner) {
    outbox = {};
    saveOutbox();
  }
  outboxOwner = nextOwner;
  localStorage.setItem(OUTBOX_OWNER_KEY, outboxOwner);
  syncSuspended = localStorage.getItem(suspensionKey()) === 'true';
};
const outboxKey = (row) => `${row.edition_id}:${row.signal_id}`;
const publicUser = () => session?.user ? {
  id: session.user.id,
  label: session.user.user_metadata?.user_name || session.user.email || '已登录用户'
} : null;
const emitStatus = (state, message = '') => status({
  enabled: Boolean(config?.enabled),
  state,
  message,
  user: publicUser(),
  pending_count: Object.keys(outbox).length
});

const queue = (input) => {
  const { _origin: origin = 'action', ...row } = input || {};
  if (!config?.enabled || !row?.signal_id || row.edition_id !== config.edition_id) return;
  if (origin === 'snapshot' && syncSuspended) return;
  if (origin !== 'snapshot' && syncSuspended) {
    syncSuspended = false;
    localStorage.removeItem(suspensionKey());
  }
  outbox[outboxKey(row)] = { ...row, client_id: clientId };
  saveOutbox();
  emitStatus(navigator.onLine ? 'pending' : 'offline', navigator.onLine ? '等待同步' : '离线保存');
  scheduleFlush();
};

const pull = async () => {
  if (!session) return;
  const { data, error } = await client
    .from('signal_feedback')
    .select('edition_id,signal_id,saved,preference,hidden,reason_code,evidence_flag,updated_at')
    .eq('edition_id', config.edition_id)
    .order('updated_at', { ascending: true });
  if (error) throw error;
  const pending = new Map(Object.values(outbox).map((row) => [outboxKey(row), row]));
  const merged = (data || []).filter((row) => {
    const local = pending.get(outboxKey(row));
    return !local || String(local.updated_at) <= String(row.updated_at);
  });
  remote(merged);
};

const flush = async () => {
  if (!config?.enabled || !session || !navigator.onLine || syncing) return;
  const queued = Object.values(outbox).sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)));
  if (!queued.length) {
    await pull();
    emitStatus('synced', '云端反馈已同步');
    return;
  }
  syncing = true;
  emitStatus('syncing', '正在同步反馈');
  try {
    const batchSize = Math.max(1, Math.min(20, Number(config.maximum_batch_rows || 20)));
    for (let offset = 0; offset < queued.length; offset += batchSize) {
      const batch = queued.slice(offset, offset + batchSize).map((row) => ({ ...row, user_id: session.user.id }));
      const { error } = await client.from('signal_feedback').upsert(batch, {
        onConflict: 'user_id,edition_id,signal_id',
        ignoreDuplicates: false
      });
      if (error) throw error;
      for (const row of batch) {
        const key = outboxKey(row);
        if (outbox[key]?.updated_at === row.updated_at) delete outbox[key];
      }
      saveOutbox();
    }
    await pull();
    emitStatus('synced', '云端反馈已同步');
  } catch (error) {
    console.warn('NewsFlow Supabase sync deferred:', error.message);
    emitStatus('error', '云端暂不可用，反馈仍保存在本机');
  } finally {
    syncing = false;
  }
};

function scheduleFlush() {
  window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(flush, Math.max(1, Number(config?.debounce_seconds || 5)) * 1000);
}

const signIn = async () => {
  const redirectTo = new URL('./', window.location.href).href;
  const { error } = await client.auth.signInWithOAuth({
    provider: config.auth_provider || 'github',
    options: { redirectTo }
  });
  if (error) {
    console.warn('NewsFlow Supabase sign-in failed:', error.message);
    emitStatus('error', '登录失败，请检查 Supabase 回调地址');
  }
};

const clearCloudFeedback = async () => {
  if (!session) return;
  const { error } = await client.from('signal_feedback').delete().eq('edition_id', config.edition_id);
  if (error) throw error;
  outbox = {};
  saveOutbox();
  syncSuspended = true;
  localStorage.setItem(suspensionKey(), 'true');
  remote([]);
  emitStatus('synced', '云端副本已清除；新反馈前不会自动重建');
};

window.addEventListener('newsflow:feedback-changed', (event) => queue(event.detail));
window.addEventListener('newsflow:cloud-action', async (event) => {
  if (!config?.enabled || !client) return;
  const action = event.detail?.action;
  try {
    if (action === 'sign-in') await signIn();
    if (action === 'sign-out') await client.auth.signOut();
    if (action === 'sync') await flush();
    if (action === 'clear') await clearCloudFeedback();
  } catch (error) {
    console.warn('NewsFlow Supabase action failed:', error.message);
    emitStatus('error', '云端操作失败，本机数据未丢失');
  }
});
window.addEventListener('online', scheduleFlush);

const initialize = async () => {
  try {
    const response = await fetch(CONFIG_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error(`config ${response.status}`);
    config = await response.json();
    if (config.schema_version !== '1.0' || config.enabled !== true) {
      emitStatus('disabled', '云同步尚未配置');
      return;
    }
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url || '') || !String(config.publishable_key || '').startsWith('sb_publishable_')) {
      emitStatus('error', 'Supabase 公共配置无效');
      return;
    }
    client = createClient(config.url, config.publishable_key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    session = data.session;
    bindOutbox(session?.user?.id);
    client.auth.onAuthStateChange((_event, nextSession) => {
      session = nextSession;
      bindOutbox(session?.user?.id);
      emitStatus(session ? 'pending' : 'signed-out', session ? '已登录，准备同步' : '登录后可跨设备同步');
      if (session) {
        window.dispatchEvent(new CustomEvent('newsflow:request-feedback-snapshot'));
        scheduleFlush();
      } else {
        remote([]);
      }
    });
    emitStatus(session ? 'pending' : 'signed-out', session ? '已登录，准备同步' : '登录后可跨设备同步');
    if (session) {
      window.dispatchEvent(new CustomEvent('newsflow:request-feedback-snapshot'));
      await flush();
    }
  } catch (error) {
    console.warn('NewsFlow Supabase initialization deferred:', error.message);
    emitStatus('error', '云端初始化失败，本地反馈继续可用');
  }
};

initialize();
