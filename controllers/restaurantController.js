const supabase = require('../config/database');

// Create new restaurant
exports.createRestaurant = async (req, res) => {
  try {
    const { uid } = req.user;
    
    // Get host_id from firebase_uid
    const { data: host, error: hostError } = await supabase
      .from('hosts')
      .select('id')
      .eq('firebase_uid', uid)
      .single();

    if (hostError || !host) {
      return res.status(404).json({ error: 'Host profile not found' });
    }

    const payload = {
      ...req.body,
      host_id: host.id,
      status: 'pending' // Goes to admin dashboard
    };

    const { data, error } = await supabase
      .from('restaurants')
      .insert([payload])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Restaurant submitted successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all restaurants for current host
exports.getMyRestaurants = async (req, res) => {
  try {
    const { uid } = req.user;

    // Get host_id from firebase_uid
    const { data: host, error: hostError } = await supabase
      .from('hosts')
      .select('id')
      .eq('firebase_uid', uid)
      .single();

    if (hostError || !host) {
      return res.status(404).json({ error: 'Host profile not found' });
    }

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('host_id', host.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: error.message });
  }
};

// Edit restaurant properties (Staged Update)
exports.updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;
    
    // Validate Ownership
    const db = require('../config/database');
    const { data: host } = await db.from('hosts').select('id').eq('firebase_uid', uid).single();
    if (!host) return res.status(403).json({ error: 'Auth context invalid' });

    const { data: restCheck } = await db.from('restaurants').select('id').eq('id', id).eq('host_id', host.id).single();
    if (!restCheck) return res.status(403).json({ error: 'Permission Denied. Property mismatch.' });

    const payload = { ...req.body };
    delete payload.id; delete payload.host_id; // Secure immutable vectors

    // We do NOT update columns physically anymore. We stage them natively.
    const { data, error } = await db.from('restaurants').update({
        status: 'update_pending',
        pending_changes: payload
    }).eq('id', id).select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle status cleanly
exports.toggleRestaurantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { uid } = req.user;
    
    const { data: host } = await require('../config/database').from('hosts').select('id').eq('firebase_uid', uid).single();
    const { data: restCheck } = await require('../config/database').from('restaurants').select('id').eq('id', id).eq('host_id', host.id).single();
    if (!host || !restCheck) return res.status(403).json({ error: 'Permission Denied.' });

    const { error } = await require('../config/database').from('restaurants').update({ status }).eq('id', id);
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
