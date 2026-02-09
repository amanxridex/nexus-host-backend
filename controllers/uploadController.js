const supabase = require('../config/database');

// Upload ID card
exports.uploadIdCard = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { uid } = req.user;
    const file = req.file;

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `id-cards/${uid}/${timestamp}-${file.originalname}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('host-documents')
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('host-documents')
      .getPublicUrl(filename);

    res.json({
      success: true,
      url: publicUrl,
      filename: filename
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload avatar
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { uid } = req.user;
    const file = req.file;

    // Generate filename
    const filename = `avatars/${uid}/${Date.now()}-${file.originalname}`;

    // Upload
    const { error: uploadError } = await supabase
      .storage
      .from('host-documents')
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('host-documents')
      .getPublicUrl(filename);

    // Update host profile
    await supabase
      .from('hosts')
      .update({ avatar_url: publicUrl })
      .eq('firebase_uid', uid);

    res.json({
      success: true,
      url: publicUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};