const supabase = require('../config/database');
const admin = require('../config/firebase');

// Check if host exists
exports.checkHost = async (req, res) => {
  try {
    const { uid } = req.user;

    const { data, error } = await supabase
      .from('hosts')
      .select('id, verification_status, is_active')
      .eq('firebase_uid', uid)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      exists: !!data,
      status: data?.verification_status || null,
      isActive: data?.is_active || false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new host (signup)
exports.createHost = async (req, res) => {
  try {
    const { uid, email } = req.user;
    const {
      full_name,
      phone,
      college_name,
      registration_number,
      designation,
      department,
      year_of_study,
      id_card_url
    } = req.body;

    // Validate required fields
    if (!full_name || !phone || !college_name || !registration_number) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['full_name', 'phone', 'college_name', 'registration_number']
      });
    }

    // Check if host already exists
    const { data: existing } = await supabase
      .from('hosts')
      .select('id')
      .eq('firebase_uid', uid)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Host already registered' });
    }

    // Create host
    const { data, error } = await supabase
      .from('hosts')
      .insert({
        firebase_uid: uid,
        email,
        full_name,
        phone,
        college_name,
        registration_number,
        designation: designation || 'Student Organizer',
        department,
        year_of_study,
        id_card_url,
        verification_status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase
      .from('host_activity_log')
      .insert({
        host_id: data.id,
        activity_type: 'signup',
        activity_data: { email, college_name }
      });

    res.status(201).json({
      success: true,
      message: 'Host registered successfully. Pending verification.',
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login host (get profile)
exports.loginHost = async (req, res) => {
  try {
    const { uid } = req.user;

    const { data, error } = await supabase
      .from('hosts')
      .select('*')
      .eq('firebase_uid', uid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          error: 'Host not found',
          needsProfile: true 
        });
      }
      throw error;
    }

    if (!data.is_active) {
      return res.status(403).json({ 
        error: 'Account deactivated',
        reason: data.block_reason || 'Contact support'
      });
    }

    // Log login activity
    await supabase
      .from('host_activity_log')
      .insert({
        host_id: data.id,
        activity_type: 'login',
        activity_data: { ip: req.ip, user_agent: req.headers['user-agent'] }
      });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update host profile
exports.updateProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.firebase_uid;
    delete updates.email;
    delete updates.verification_status;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('hosts')
      .update(updates)
      .eq('firebase_uid', uid)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Profile updated',
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};