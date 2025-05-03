// server/models/Utils.js
function applyTZTransform(schema) {
  schema.set('toJSON', {
    transform: (doc, ret) => {
      ['createdAt', 'updatedAt'].forEach(field => {
        if (ret[field]) {
          // Convert to Bucharest time via toLocaleString (en-US so month/day order)
          const local = new Date(
            new Date(ret[field])
              .toLocaleString('en-US', { timeZone: 'Europe/Bucharest' })
          );
          // Build dd-mm-yyyy HH:MM:SS
          const dd = String(local.getDate()).padStart(2, '0');
          const mm = String(local.getMonth() + 1).padStart(2, '0');
          const yyyy = local.getFullYear();
          const hh = String(local.getHours()).padStart(2, '0');
          const mi = String(local.getMinutes()).padStart(2, '0');
          const ss = String(local.getSeconds()).padStart(2, '0');

          ret[field] = `${dd}-${mm}-${yyyy} ${hh}:${mi}:${ss}`;
        }
      });
      return ret;
    }
  });
}

module.exports = { applyTZTransform };
