/* ============ 内存存储（演示模式 / 无 DATABASE_URL 时使用） ============
 * 与 pgStore 相同的异步接口；数据仅存进程内存，重启即清空。
 * 用于本地开发和“先跑起来看看”，正式上线请配置 DATABASE_URL。
 */
'use strict';

function createMemoryStore() {
  var users = [];       // {id,email,name,role,pass_hash,active,created_at}
  var collections = {}; // name -> {data, updated_at, updated_by}
  var settings = {};    // key -> value
  var audit = [];       // {id,ts,user_id,user_email,action,detail}
  var auditSeq = 0;

  return {
    kind: 'memory',
    async init() { /* 无需建表 */ },

    users: {
      async list() {
        return users.map(function (u) {
          return { id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, created_at: u.created_at };
        });
      },
      async getByEmail(email) {
        return users.find(function (u) { return u.email.toLowerCase() === String(email).toLowerCase(); }) || null;
      },
      async getById(id) {
        return users.find(function (u) { return u.id === id; }) || null;
      },
      async create(u) { users.push(u); return u; },
      async update(id, patch) {
        var u = users.find(function (x) { return x.id === id; });
        if (!u) return null;
        Object.keys(patch).forEach(function (k) { u[k] = patch[k]; });
        return u;
      },
      async remove(id) {
        var i = users.findIndex(function (x) { return x.id === id; });
        if (i >= 0) users.splice(i, 1);
      }
    },

    collections: {
      // 返回 { name: {data, version} }
      async getAll() {
        var out = {};
        Object.keys(collections).forEach(function (k) {
          out[k] = { data: collections[k].data, version: collections[k].version };
        });
        return out;
      },
      async get(name) {
        return collections[name] ? { data: collections[name].data, version: collections[name].version } : null;
      },
      // 乐观锁：baseVersion 与当前版本不一致时返回 conflict，不覆盖
      async set(name, data, userId, baseVersion) {
        var cur = collections[name];
        var curVer = cur ? cur.version : 0;
        if (baseVersion != null && baseVersion !== curVer) {
          return { conflict: true, version: curVer, data: cur ? cur.data : null };
        }
        var newVer = curVer + 1;
        collections[name] = { data: data, version: newVer, updated_at: new Date().toISOString(), updated_by: userId || null };
        return { ok: true, version: newVer };
      }
    },

    settings: {
      async get(key) { return key in settings ? settings[key] : null; },
      async set(key, value) { settings[key] = value; return value; }
    },

    audit: {
      async log(entry) {
        auditSeq++;
        audit.unshift(Object.assign({ id: auditSeq, ts: new Date().toISOString() }, entry));
        if (audit.length > 2000) audit.length = 2000;
      },
      async list(limit) {
        return audit.slice(0, limit || 200);
      }
    }
  };
}

module.exports = createMemoryStore;
