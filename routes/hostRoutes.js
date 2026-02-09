// Check if host exists
router.get('/check', verifyToken, async (req, res) => {
    const { data } = await supabase
        .from('hosts')
        .select('*')
        .eq('email', req.user.email)
        .single();
    
    res.json({ 
        exists: !!data,
        host: data || null
    });
});

// Create host (after profile completion)
router.post('/create', verifyToken, async (req, res) => {
    const { full_name, phone, college_name, registration_number, id_card_url } = req.body;
    
    const { data, error } = await supabase
        .from('hosts')
        .insert({
            email: req.user.email,
            password_hash: req.user.uid, // Firebase UID as password hash
            full_name,
            phone,
            college_name,
            registration_number,
            id_card_url
        })
        .select()
        .single();
    
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, data });
});

// Login (get host data)
router.post('/login', verifyToken, async (req, res) => {
    const { data, error } = await supabase
        .from('hosts')
        .select('*')
        .eq('email', req.user.email)
        .single();
    
    if (error || !data) {
        return res.status(404).json({ error: 'Host not found' });
    }
    
    res.json({ success: true, data });
});