/**
 * Patch: add missing `createdAt` to Luis Mosquera routines
 * Run via: node functions/patch-luis-mosquera.js (needs ADC)
 * Or deploy as one-time function (same pattern as seed)
 */
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

exports.patchLuisMosquera = onRequest(
  { region: 'us-central1', invoker: 'public', timeoutSeconds: 30 },
  async (req, res) => {
    if (req.query.token !== 'tgwl-patch-2026') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const db = admin.firestore();
      // Find all Luis Mosquera routines missing createdAt
      const snap = await db.collection('routines')
        .where('createdBy', '==', 'seed-script')
        .get();

      if (snap.empty) {
        return res.json({ ok: true, updated: 0, message: 'No docs found' });
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();
      snap.docs.forEach(doc => {
        batch.update(doc.ref, { createdAt: now });
      });
      await batch.commit();

      return res.json({
        ok: true,
        updated: snap.size,
        ids: snap.docs.map(d => d.id),
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);
