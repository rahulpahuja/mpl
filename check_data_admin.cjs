process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const app = initializeApp({ projectId: 'demo-mpl-test' });
const db = getFirestore(app);

async function main() {
  const auctionsSnap = await db.collection('auctions').get();
  const auctions = auctionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log('=== Auctions ===');
  for (const a of auctions) {
    console.log(a.id, '-', a.name, '- teamManagerIds:', a.teamManagerIds);
    for (const tm of a.teamManagers || []) {
      console.log('   team manager:', tm.managerId, tm.name);
    }
  }

  const usersSnap = await db.collection('users').get();
  console.log('\n=== Users assignedAuctions ===');
  for (const doc of usersSnap.docs) {
    const u = doc.data();
    console.log(doc.id, u.displayName, u.role, '-> assignedAuctions:', u.assignedAuctions);
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
