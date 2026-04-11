const supabase = require('../config/database');

// Create new property
exports.createProperty = async (req, res) => {
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

    const propertyData = {
      ...req.body,
      host_id: host.id,
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('properties')
      .insert([propertyData])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Property submitted successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all properties for current host
exports.getMyProperties = async (req, res) => {
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
      .from('properties')
      .select('*')
      .eq('host_id', host.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: error.message });
  }
};
