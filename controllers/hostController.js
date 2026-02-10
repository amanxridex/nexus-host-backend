const supabase = require('../config/database');

// Get host profile
exports.getProfile = async (req, res) => {
  try {
    const { uid } = req.user;

    const { data, error } = await supabase
      .from('hosts')
      .select(`*`)
      .eq('firebase_uid', uid)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Host not found' });

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

    if (!host) return res.status(404).json({ error: 'Host not found' });

    // Get fest stats
    const { data: fests, error: festsError } = await supabase
      .from('fests')
      .select('id, status')
      .eq('host_id', host.id);

    if (festsError) throw festsError;

    const stats = {
      totalFests: fests?.length || 0,
      activeFests: fests?.filter(f => f.status === 'published').length || 0,
      pendingFests: fests?.filter(f => f.status === 'pending_approval').length || 0,
      totalRevenue: 0,
      ticketsSold: 0
    };

    res.json({ success: true, stats });
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

    if (!host) return res.status(404).json({ error: 'Host not found' });

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