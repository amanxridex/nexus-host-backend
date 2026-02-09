const supabase = require('../config/database');

// Get host profile
exports.getProfile = async (req, res) => {
  try {
    const { uid } = req.user;

    const { data, error } = await supabase
      .from('hosts')
      .select(`
        *,
        host_documents (*)
      `)
      .eq('firebase_uid', uid)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get host stats
exports.getStats = async (req, res) => {
  try {
    const { uid } = req.user;

    const { data: host } = await supabase
      .from('hosts')
      .select('id')
      .eq('firebase_uid', uid)
      .single();

    // Get various stats
    const [eventsCount, totalRevenue, ticketsSold] = await Promise.all([
      supabase.from('host_events').select('count', { count: 'exact' }).eq('host_id', host.id),
      // Add more stats queries here
    ]);

    res.json({
      success: true,
      stats: {
        events: eventsCount.count || 0,
        revenue: 0, // Calculate from actual data
        tickets: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get activity log
exports.getActivity = async (req, res) => {
  try {
    const { uid } = req.user;
    const { limit = 20 } = req.query;

    const { data: host } = await supabase
      .from('hosts')
      .select('id')
      .eq('firebase_uid', uid)
      .single();

    const { data, error } = await supabase
      .from('host_activity_log')
      .select('*')
      .eq('host_id', host.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};