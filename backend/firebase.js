const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'd-toto-app',
  storageBucket: 'd-toto-app.firebasestorage.app',
});

module.exports = admin;