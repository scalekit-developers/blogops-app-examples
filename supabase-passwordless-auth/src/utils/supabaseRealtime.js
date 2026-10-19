// Subscribe to real-time profile changes
const supabase = require('../config/supabase');

function subscribeToProfileChanges(callback) {
  const channel = supabase.channel('profile-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'profiles',
    }, payload => {
      callback(payload);
    })
    .subscribe();
  return channel;
}

module.exports = { subscribeToProfileChanges };
