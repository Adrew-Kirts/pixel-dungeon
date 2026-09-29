import { createStore } from './store.js';

const [command, argument] = process.argv.slice(2);
const store = createStore(process.env.DB_PATH ?? '/data/strikwerda.db');

if (command === 'list') {
  for (const row of store.listResults(Number(argument ?? 20))) {
    console.log(`${row.share_id}\t${row.initials ?? '---'}\t${row.score}\t${row.outcome}\t${row.hero_name}\t${new Date(Number(row.created_at)).toISOString()}`);
  }
} else if (command === 'delete' && typeof argument === 'string') {
  console.log(store.deleteResult(argument) === true ? `deleted ${argument}` : `no result ${argument}`);
} else {
  console.log('usage: node api/admin.js list [limit] | delete <shareId>');
  process.exitCode = 1;
}
store.close();
