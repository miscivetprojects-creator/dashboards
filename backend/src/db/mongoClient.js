const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const config = require('../config');

try {
  if (!fs.existsSync(config.DATA_DIR)) {
    fs.mkdirSync(config.DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(config.EXCEL_TEMPLATES_DIR)) {
    fs.mkdirSync(config.EXCEL_TEMPLATES_DIR, { recursive: true });
  }
  if (!fs.existsSync(config.UPLOADS_DIR)) {
    fs.mkdirSync(config.UPLOADS_DIR, { recursive: true });
  }
} catch (e) {}

class EmbeddedCollection {
  constructor(name, database) {
    this.name = name;
    this.database = database;
    if (!this.database.recordsData[name]) {
      this.database.recordsData[name] = [];
    }
  }

  get items() {
    return this.database.recordsData[this.name] || [];
  }

  set items(newItems) {
    this.database.recordsData[this.name] = newItems;
    this.database.persistToDisk();
  }

  evaluateDocumentMatch(doc, filter) {
    if (!filter || Object.keys(filter).length === 0) return true;
    for (const [key, val] of Object.entries(filter)) {
      if (key === '$or') {
        if (!Array.isArray(val) || !val.some(sub => this.evaluateDocumentMatch(doc, sub))) return false;
        continue;
      }
      if (key === '$and') {
        if (!Array.isArray(val) || !val.every(sub => this.evaluateDocumentMatch(doc, sub))) return false;
        continue;
      }

      const docVal = doc[key];
      if (val instanceof RegExp) {
        if (!val.test(String(docVal || ''))) return false;
        continue;
      }

      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        for (const [op, opVal] of Object.entries(val)) {
          if (op === '$eq' && docVal !== opVal) return false;
          if (op === '$ne' && docVal === opVal) return false;
          if (op === '$gt' && !(Number(docVal) > Number(opVal))) return false;
          if (op === '$gte' && !(Number(docVal) >= Number(opVal))) return false;
          if (op === '$lt' && !(Number(docVal) < Number(opVal))) return false;
          if (op === '$lte' && !(Number(docVal) <= Number(opVal))) return false;
          if (op === '$in') {
            if (!Array.isArray(opVal) || !opVal.includes(docVal)) return false;
          }
          if (op === '$nin') {
            if (Array.isArray(opVal) && opVal.includes(docVal)) return false;
          }
        }
        continue;
      }

      if (docVal !== val) return false;
    }
    return true;
  }

  find(filter = {}, projectionOptions = {}) {
    const list = this.items.filter(doc => this.evaluateDocumentMatch(doc, filter));
    return new EmbeddedCursor(list, this, projectionOptions);
  }

  async findOne(filter = {}, projectionOptions = {}) {
    const doc = this.items.find(d => this.evaluateDocumentMatch(d, filter));
    if (!doc) return null;
    return JSON.parse(JSON.stringify(doc));
  }

  async insertOne(doc) {
    const toInsert = JSON.parse(JSON.stringify(doc));
    if (!toInsert._id) {
      toInsert._id = 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    }
    this.items = [...this.items, toInsert];
    return { insertedId: toInsert._id, acknowledged: true };
  }

  async insertMany(docs) {
    const toInsert = docs.map(d => {
      const copy = JSON.parse(JSON.stringify(d));
      if (!copy._id) {
        copy._id = 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      }
      return copy;
    });
    this.items = [...this.items, ...toInsert];
    return {
      insertedCount: toInsert.length,
      insertedIds: toInsert.map(d => d._id),
      acknowledged: true
    };
  }

  async updateOne(filter, updateDoc, options = {}) {
    const idx = this.items.findIndex(d => this.evaluateDocumentMatch(d, filter));
    if (idx === -1) {
      if (options.upsert) {
        const newDoc = { ...(updateDoc.$set || {}), ...filter };
        await this.insertOne(newDoc);
        return { matchedCount: 0, modifiedCount: 1, upsertedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    }

    const current = JSON.parse(JSON.stringify(this.items[idx]));
    if (updateDoc.$set) {
      Object.assign(current, updateDoc.$set);
    }
    if (updateDoc.$inc) {
      for (const [k, v] of Object.entries(updateDoc.$inc)) {
        current[k] = (Number(current[k]) || 0) + Number(v);
      }
    }
    if (updateDoc.$push) {
      for (const [k, v] of Object.entries(updateDoc.$push)) {
        if (!Array.isArray(current[k])) current[k] = [];
        current[k].push(v);
      }
    }

    const updatedItems = [...this.items];
    updatedItems[idx] = current;
    this.items = updatedItems;
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(filter, updateDoc) {
    let modified = 0;
    const updatedItems = this.items.map(doc => {
      if (!this.evaluateDocumentMatch(doc, filter)) return doc;
      modified++;
      const current = JSON.parse(JSON.stringify(doc));
      if (updateDoc.$set) Object.assign(current, updateDoc.$set);
      if (updateDoc.$inc) {
        for (const [k, v] of Object.entries(updateDoc.$inc)) {
          current[k] = (Number(current[k]) || 0) + Number(v);
        }
      }
      return current;
    });
    this.items = updatedItems;
    return { matchedCount: modified, modifiedCount: modified };
  }

  async deleteOne(filter) {
    const idx = this.items.findIndex(d => this.evaluateDocumentMatch(d, filter));
    if (idx === -1) return { deletedCount: 0 };
    const updatedItems = [...this.items];
    updatedItems.splice(idx, 1);
    this.items = updatedItems;
    return { deletedCount: 1 };
  }

  async deleteMany(filter) {
    const prev = this.items.length;
    const remaining = this.items.filter(d => !this.evaluateDocumentMatch(d, filter));
    this.items = remaining;
    return { deletedCount: prev - remaining.length };
  }

  async countDocuments(filter = {}) {
    return this.items.filter(d => this.evaluateDocumentMatch(d, filter)).length;
  }

  async distinct(field, filter = {}) {
    const matching = this.items.filter(d => this.evaluateDocumentMatch(d, filter));
    const set = new Set();
    matching.forEach(d => {
      if (d[field] !== undefined && d[field] !== null) {
        set.add(d[field]);
      }
    });
    return Array.from(set);
  }

  aggregate(pipeline = []) {
    return new EmbeddedAggregateCursor(this.items, pipeline, this);
  }
}

class EmbeddedCursor {
  constructor(data, collection, projectionOptions) {
    this.raw = JSON.parse(JSON.stringify(data));
    this.collection = collection;
    this.projectionOptions = projectionOptions;
  }

  sort(sortCriteria) {
    this.raw.sort((a, b) => {
      for (const [k, dir] of Object.entries(sortCriteria)) {
        const valA = a[k];
        const valB = b[k];
        if (valA === valB) continue;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (valA < valB) return dir === 1 || dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 1 || dir === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return this;
  }

  skip(count) {
    this.raw = this.raw.slice(count);
    return this;
  }

  limit(count) {
    this.raw = this.raw.slice(0, count);
    return this;
  }

  project(proj) {
    if (!proj) return this;
    this.raw = this.raw.map(doc => {
      const out = {};
      for (const [k, v] of Object.entries(proj)) {
        if (v === 1 || v === true) out[k] = doc[k];
      }
      return out;
    });
    return this;
  }

  async toArray() {
    return this.raw;
  }
}

class EmbeddedAggregateCursor {
  constructor(initialData, pipeline = [], collection) {
    this.data = JSON.parse(JSON.stringify(initialData));
    this.pipeline = pipeline;
    this.collection = collection;
  }

  async toArray() {
    let current = this.data;

    for (const stage of this.pipeline) {
      const [op, config] = Object.entries(stage)[0];

      if (op === '$match') {
        current = current.filter(doc => this.collection.evaluateDocumentMatch(doc, config));
      } else if (op === '$group') {
        const groups = new Map();
        const idExpr = config._id;

        for (const doc of current) {
          let groupKey;
          if (idExpr === null) {
            groupKey = '__global__';
          } else if (typeof idExpr === 'string' && idExpr.startsWith('$')) {
            groupKey = doc[idExpr.substring(1)];
          } else if (typeof idExpr === 'object') {
            const composite = {};
            for (const [k, v] of Object.entries(idExpr)) {
              composite[k] = typeof v === 'string' && v.startsWith('$') ? doc[v.substring(1)] : v;
            }
            groupKey = JSON.stringify(composite);
          } else {
            groupKey = idExpr;
          }

          if (!groups.has(groupKey)) {
            const initialDoc = { _id: typeof idExpr === 'object' ? JSON.parse(groupKey) : (groupKey === '__global__' ? null : groupKey) };
            for (const [field, acc] of Object.entries(config)) {
              if (field === '_id') continue;
              initialDoc[field] = 0;
            }
            groups.set(groupKey, { doc: initialDoc, items: [] });
          }
          groups.get(groupKey).items.push(doc);
        }

        const grouped = [];
        for (const [, grp] of groups.entries()) {
          const out = { ...grp.doc };
          for (const [field, acc] of Object.entries(config)) {
            if (field === '_id') continue;
            const [accOp, accExpr] = Object.entries(acc)[0];

            if (accOp === '$sum') {
              if (accExpr === 1) {
                out[field] = grp.items.length;
              } else if (typeof accExpr === 'string' && accExpr.startsWith('$')) {
                const prop = accExpr.substring(1);
                out[field] = grp.items.reduce((s, it) => s + (Number(it[prop]) || 0), 0);
              } else if (typeof accExpr === 'number') {
                out[field] = grp.items.length * accExpr;
              }
            } else if (accOp === '$avg') {
              const prop = accExpr.substring(1);
              const valid = grp.items.filter(it => it[prop] !== undefined && it[prop] !== null);
              out[field] = valid.length ? valid.reduce((s, it) => s + Number(it[prop]), 0) / valid.length : 0;
            } else if (accOp === '$min') {
              const prop = accExpr.substring(1);
              out[field] = Math.min(...grp.items.map(it => Number(it[prop]) || 0));
            } else if (accOp === '$max') {
              const prop = accExpr.substring(1);
              out[field] = Math.max(...grp.items.map(it => Number(it[prop]) || 0));
            } else if (accOp === '$push') {
              const prop = accExpr.substring(1);
              out[field] = grp.items.map(it => it[prop]);
            }
          }
          grouped.push(out);
        }
        current = grouped;
      } else if (op === '$sort') {
        current.sort((a, b) => {
          for (const [k, dir] of Object.entries(config)) {
            const valA = a[k];
            const valB = b[k];
            if (valA === valB) continue;
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;
            if (valA < valB) return dir === 1 ? -1 : 1;
            if (valA > valB) return dir === 1 ? 1 : -1;
          }
          return 0;
        });
      } else if (op === '$limit') {
        current = current.slice(0, config);
      } else if (op === '$skip') {
        current = current.slice(config);
      } else if (op === '$project') {
        current = current.map(doc => {
          const projected = {};
          for (const [k, expr] of Object.entries(config)) {
            if (expr === 1 || expr === true) projected[k] = doc[k];
            else if (typeof expr === 'string' && expr.startsWith('$')) projected[k] = doc[expr.substring(1)];
            else projected[k] = expr;
          }
          return projected;
        });
      }
    }

    return current;
  }
}

class EmbeddedDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.collectionsMap = new Map();
    this.recordsData = {};
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.recordsData = JSON.parse(raw);
      } else {
        this.recordsData = {};
        this.persistToDisk();
      }
    } catch {
      this.recordsData = {};
    }
  }

  persistToDisk() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.recordsData, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed writing embedded database:', err);
    }
  }

  collection(collectionName) {
    if (!this.collectionsMap.has(collectionName)) {
      this.collectionsMap.set(collectionName, new EmbeddedCollection(collectionName, this));
    }
    return this.collectionsMap.get(collectionName);
  }
}

let activeClientInstance = null;
let activeDatabaseInstance = null;
let isEmbeddedModeActive = false;

async function connectDB() {
  if (activeDatabaseInstance) return activeDatabaseInstance;

  if (config.MONGODB_URI) {
    try {
      console.log('Attempting MongoDB connection to:', config.MONGODB_URI);
      const mongo = new MongoClient(config.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      });
      await mongo.connect();
      activeClientInstance = mongo;
      activeDatabaseInstance = mongo.db(mongo.options?.dbName && mongo.options.dbName !== 'test' ? mongo.options.dbName : 'civet_dashboards');
      isEmbeddedModeActive = false;
      console.log('Connected to MongoDB Server at:', config.MONGODB_URI);
      return activeDatabaseInstance;
    } catch (err) {
      console.log('Activating Embedded File-Persistent MongoDB Engine at local data file.');
    }
  }

  const databaseFilePath = path.resolve(config.DATA_DIR, 'civet_db_data.json');
  activeDatabaseInstance = new EmbeddedDatabase(databaseFilePath);
  isEmbeddedModeActive = true;
  console.log('Embedded Persistent Database Engine active at:', databaseFilePath);
  return activeDatabaseInstance;
}

function getDB() {
  if (!activeDatabaseInstance) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return activeDatabaseInstance;
}

function getCollection(collectionName) {
  return getDB().collection(collectionName);
}

module.exports = {
  connectDB,
  getDB,
  getCollection,
  isEmbedded: () => isEmbeddedModeActive
};
