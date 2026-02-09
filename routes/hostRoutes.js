const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const supabase = require('../config/database');

// ============================================
// HOST AUTH ROUTES
// ============================================

// Check if host exists
router.get('/check', verifyToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hosts')
            .select('*')
            .eq('email', req.user.email)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        res.json({ 
            exists: !!data,
            host: data || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create host (after profile completion)
router.post('/create', verifyToken, async (req, res) => {
    try {
        const { full_name, phone, college_name, registration_number, id_card_url } = req.body;

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
            .eq('email', req.user.email)
            .single();

        if (existing) {
            return res.status(409).json({ error: 'Host already exists' });
        }

        // Create host
        const { data, error } = await supabase
            .from('hosts')
            .insert({
                email: req.user.email,
                password_hash: req.user.uid,
                full_name,
                phone,
                college_name,
                registration_number,
                id_card_url,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ 
            success: true, 
            message: 'Host created successfully',
            data 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login (get host data)
router.post('/login', verifyToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hosts')
            .select('*')
            .eq('email', req.user.email)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Host not found' });
        }

        if (!data.is_active) {
            return res.status(403).json({ error: 'Account deactivated' });
        }

        res.json({ 
            success: true, 
            data 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// HOST PROFILE ROUTES
// ============================================

// Get host profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hosts')
            .select('*')
            .eq('email', req.user.email)
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update host profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const updates = req.body;
        
        // Remove fields that shouldn't be updated
        delete updates.id;
        delete updates.email;
        delete updates.password_hash;
        delete updates.created_at;

        const { data, error } = await supabase
            .from('hosts')
            .update(updates)
            .eq('email', req.user.email)
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
});

// ============================================
// COLLEGE ROUTES
// ============================================

// Get all colleges
router.get('/colleges', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('colleges')
            .select('*')
            .order('name');

        if (error) throw error;

        res.json({ 
            success: true, 
            count: data.length,
            data 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;