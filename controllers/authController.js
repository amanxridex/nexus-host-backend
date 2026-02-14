const supabase = require('../config/database');
const admin = require('../config/firebase');
const jwt = require('jsonwebtoken'); // ✅ ADDED

// ✅ NEW: Create host session cookie after Firebase login
exports.createHostSession = async (req, res) => {
  try {
    const { idToken } = req.body; // Firebase ID token from frontend
    
    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Create custom session token (30 days expiry)
    const sessionToken = jwt.sign(
      { 
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name
      },
      process.env.HOST_COOKIE_SECRET, // ✅ HOST's own secret
      { expiresIn: '30d' }
    );
    
    // Set HTTP Only cookie
    res.cookie('host_session', sessionToken, { // ✅ host_session cookie
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    });
    
    res.json({
      success: true,
      message: 'Host session created',
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name
      }
    });
    
  } catch (error) {
    console.error('Create host session error:', error);
    res.status(500).json({ success: false, message: 'Failed to create session' });
  }
};

// ✅ NEW: Logout - clear host cookie
exports.logoutHost = async (req, res) => {
  try {
    res.clearCookie('host_session', { // ✅ host_session
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    res.json({ success: true, message: 'Logged out successfully' });
    
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

// Check if host exists (updated to use session)
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

    if (!full_name || !phone || !college_name || !registration_number) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['full_name', 'phone', 'college_name', 'registration_number']
      });
    }

    const { data: existing } = await supabase
      .from('hosts')
      .select('id')
      .eq('firebase_uid', uid)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Host already registered' });
    }

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