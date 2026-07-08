/* ============ PostgreSQL 存储（配置 DATABASE_URL 时使用） ============
 * 与 memoryStore 相同的异步接口，routes 层无需感知用的是哪种存储。
 */
'use strict';
var fs = require('fs');
var path = require('path');

function createPgStore(databaseUrl) {
  var Pool = require('pg').Pool;
  var pool = new Pool({ connectionString: databaseUrl, max: 10 });
  // 关键：监听空闲连接错误，否则 DB 重启/网络抖动会让 Node 抛未捕获异常并崩溃
  pool.on('error', function (err) {
    console.error('[pg] 空闲连接错误（连接池将自动重建）:', err.message);
  });

  async function q(text, params) {
    var res = await pool.query(text, params);
    return res.rows;
  }

  return {
    kind: 'postgres',
    async init() {
      var sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await pool.query(sql);
    },

    users: {
      async list() {
        return q('SELECT id,email,name,role,active,created_at FROM users ORDER BY created_at');
      },
      async getByEmail(email) {
        var rows = await q('SELECT * FROM users WHERE lower(email)=lower($1)', [email]);
        return rows[0] || null;
      },
      async getById(id) {
        var rows = await q('SELECT * FROM users WHERE id=$1', [id]);
        return rows[0] || null;
      },
      async create(u) {
        await q(
          'INSERT INTO users (id,email,name,role,pass_hash,active) VALUES ($1,$2,$3,$4,$5,$6)',
          [u.id, u.email, u.name, u.role, u.pass_hash, u.active !== false]
        );
        return u;
      },
      async update(id, patch) {
        var fields = [], vals = [], i = 1;
        Object.keys(patch).forEach(function (k) { fields.push(k + '=$' + i); vals.push(patch[k]); i++; });
        if (!fields.length) return this.getById(id);
        vals.push(id);
        var rows = await q('UPDATE users SET ' + fields.join(',') + ' WHERE id=$' + i + ' RETURNING *', vals);
        return rows[0] || null;
      },
      async remove(id) { await q('DELETE FROM users WHERE id=$1', [id]); }
    },

    collections: {
      async getAll() {
        var rows = await q('SELECT name,data,version FROM collections');
        var out = {};
        rows.forEach(function (r) { out[r.name] = { data: r.data, version: r.version }; });
        return out;
      },
      async get(name) {
        var rows = await q('SELECT data,version FROM collections WHERE name=$1', [name]);
        return rows[0] ? { data: rows[0].data, version: rows[0].version } : null;
      },
      // 乐观锁：仅当当前版本 == baseVersion 时才写入并 version+1；否则返回 conflict + 当前值
      async set(name, data, userId, baseVersion) {
        var base = baseVersion == null ? 0 : baseVersion;
        var rows = await q(
          'INSERT INTO collections (name,data,version,updated_by,updated_at) VALUES ($1,$2,1,$3,now()) ' +
          'ON CONFLICT (name) DO UPDATE SET data=EXCLUDED.data, version=collections.version+1, updated_by=EXCLUDED.updated_by, updated_at=now() ' +
          'WHERE collections.version=$4 RETURNING version',
          [name, JSON.stringify(data), userId || null, base]
        );
        if (rows.length) return { ok: true, version: rows[0].version };
        var cur = await q('SELECT data,version FROM collections WHERE name=$1', [name]);
        return { conflict: true, version: cur[0] ? cur[0].version : 0, data: cur[0] ? cur[0].data : null };
      }
    },

    settings: {
      async get(key) {
        var rows = await q('SELECT value FROM settings WHERE key=$1', [key]);
        return rows[0] ? rows[0].value : null;
      },
      async set(key, value) {
        await q(
          'INSERT INTO settings (key,value,updated_at) VALUES ($1,$2,now()) ' +
          'ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()',
          [key, JSON.stringify(value)]
        );
        return value;
      }
    },

    audit: {
      async log(entry) {
        await q(
          'INSERT INTO audit_log (user_id,user_email,action,detail) VALUES ($1,$2,$3,$4)',
          [entry.user_id || null, entry.user_email || null, entry.action, JSON.stringify(entry.detail || {})]
        );
      },
      async list(limit) {
        return q('SELECT id,ts,user_id,user_email,action,detail FROM audit_log ORDER BY ts DESC LIMIT $1', [limit || 200]);
      }
    }
  };
}

module.exports = createPgStore;
