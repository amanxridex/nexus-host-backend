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
