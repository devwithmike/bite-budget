import Dexie from 'dexie';

export const db = new Dexie('BiteBudgetDB');

// Define the schema:
// ++id is auto-incrementing primary key
// name, amount, category, and date are indexed for performance
db.version(1).stores({
  transactions: '++id, name, amount, category, date',
  settings: 'id, budget'
});