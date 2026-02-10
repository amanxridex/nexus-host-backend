const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const authenticateHost = require('../middleware/authMiddleware');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// CREATE FEST
router.post('/create', authenticateHost, async (req, res) => {
    try {
        // Get firebase_uid from req.user (set by authMiddleware)
        const firebaseUid = req.user.uid;
        
        // Lookup host in database to get host_id
        const { data: host, error: hostError } = await supabase
            .from('hosts')
            .select('id')
            .eq('firebase_uid', firebaseUid)
            .single();

        if (hostError || !host) {
            console.error('Host lookup failed:', hostError);
            return res.status(404).json({ error: 'Host profile not found. Please complete your profile first.' });
        }

        const hostId = host.id;
        
        const {
            festName, festType, description, expectedAttendance,
            startDate, endDate, isPaid, ticketPrice, earlyBirdPrice,
            isUnlimited, totalSeats, allowOutside, otherColleges, generalPublic,
            idRequired, idFields, coordinatorName, contactPhone, contactEmail,
            whatsapp, venue, bannerImage
        } = req.body;

        if (!festName || !festType || !description || !startDate || !endDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let bannerUrl = null;
        if (bannerImage && bannerImage.startsWith('data:image')) {
            const base64Data = bannerImage.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `fest-banners/${firebaseUid}/${Date.now()}-banner.jpg`;
            
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('fest-assets')
                .upload(fileName, buffer, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase
                .storage
                .from('fest-assets')
                .getPublicUrl(fileName);
                
            bannerUrl = publicUrl;
        }

        const { data: fest, error } = await supabase
            .from('fests')
            .insert({
                host_id: hostId,
                firebase_uid: firebaseUid,
                fest_name: festName,
                fest_type: festType,
                description,
                expected_attendance: parseInt(expectedAttendance),
                start_date: startDate,
                end_date: endDate,
                banner_url: bannerUrl,
                is_paid: isPaid || false,
                ticket_price: isPaid ? parseFloat(ticketPrice) : null,
                early_bird_price: earlyBirdPrice ? parseFloat(earlyBirdPrice) : null,
                is_unlimited_seats: isUnlimited || false,
                total_seats: isUnlimited ? null : parseInt(totalSeats),
                allow_outside_college: allowOutside || false,
                allow_other_colleges: otherColleges || false,
                allow_general_public: generalPublic || false,
                id_verification_required: idRequired !== false,
                id_fields_required: idFields || ['idNumber', 'rollNumber'],
                coordinator_name: coordinatorName,
                contact_phone: contactPhone,
                contact_email: contactEmail,
                whatsapp_number: whatsapp,
                venue,
                status: 'published',
                submitted_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        await supabase.from('fest_analytics').insert({ fest_id: fest.id });

        res.status(201).json({
            success: true,
            message: 'Fest submitted for approval',
            fest: fest
        });

    } catch (error) {
        console.error('Create fest error:', error);
        res.status(500).json({ error: 'Failed to create fest', details: error.message });
    }
});

// SAVE DRAFT
router.post('/draft', authenticateHost, async (req, res) => {
    try {
        const firebaseUid = req.user.uid;
        
        // Lookup host
        const { data: host, error: hostError } = await supabase
            .from('hosts')
            .select('id')
            .eq('firebase_uid', firebaseUid)
            .single();

        if (hostError || !host) {
            return res.status(404).json({ error: 'Host not found' });
        }

        const hostId = host.id;
        const draftData = req.body;

        const { data, error } = await supabase
            .from('fest_drafts')
            .upsert({
                host_id: hostId,
                firebase_uid: firebaseUid,
                draft_data: draftData,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'host_id'
            })
            .select();

        if (error) throw error;

        res.json({ success: true, draft: data });
    } catch (error) {
        console.error('Save draft error:', error);
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

// GET DRAFT
router.get('/draft', authenticateHost, async (req, res) => {
    try {
        const firebaseUid = req.user.uid;

        const { data, error } = await supabase
            .from('fest_drafts')
            .select('draft_data, updated_at')
            .eq('firebase_uid', firebaseUid)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        res.json({ success: true, draft: data });
    } catch (error) {
        console.error('Get draft error:', error);
        res.status(500).json({ error: 'Failed to load draft' });
    }
});

// DELETE DRAFT
router.delete('/draft', authenticateHost, async (req, res) => {
    try {
        const firebaseUid = req.user.uid;

        const { error } = await supabase
            .from('fest_drafts')
            .delete()
            .eq('firebase_uid', firebaseUid);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Delete draft error:', error);
        res.status(500).json({ error: 'Failed to delete draft' });
    }
});

// GET MY FESTS
router.get('/my-fests', authenticateHost, async (req, res) => {
    try {
        const firebaseUid = req.user.uid;

        const { data, error } = await supabase
            .from('fests')
            .select(`
                *,
                fest_analytics (
                    total_views,
                    total_registrations,
                    total_tickets_sold,
                    total_revenue
                )
            `)
            .eq('firebase_uid', firebaseUid)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, fests: data });
    } catch (error) {
        console.error('Get fests error:', error);
        res.status(500).json({ error: 'Failed to fetch fests' });
    }
});

// GET SINGLE FEST
router.get('/:id', authenticateHost, async (req, res) => {
    try {
        const { id } = req.params;
        const firebaseUid = req.user.uid;

        const { data, error } = await supabase
            .from('fests')
            .select('*, fest_analytics(*)')
            .eq('id', id)
            .eq('firebase_uid', firebaseUid)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Fest not found' });

        res.json({ success: true, fest: data });
    } catch (error) {
        console.error('Get fest error:', error);
        res.status(500).json({ error: 'Failed to fetch fest' });
    }
});

// GET FESTS BY COLLEGE (Public - for user portal)
router.get('/by-college/:collegeId', async (req, res) => {
    try {
        const { collegeId } = req.params;

        // First, get the college name
        const { data: college, error: collegeError } = await supabase
            .from('colleges')
            .select('name')
            .eq('id', collegeId)
            .single();

        if (collegeError || !college) {
            return res.status(404).json({ error: 'College not found' });
        }

        // Get hosts from this college
        const { data: hosts, error: hostsError } = await supabase
            .from('hosts')
            .select('id, firebase_uid')
            .ilike('college_name', `%${college.name}%`);

        if (hostsError) throw hostsError;

        if (!hosts || hosts.length === 0) {
            return res.json({ success: true, fests: [], college: college.name });
        }

        const hostIds = hosts.map(h => h.id);
        const firebaseUids = hosts.map(h => h.firebase_uid);

        // Get fests from these hosts
        const { data: fests, error: festsError } = await supabase
            .from('fests')
            .select(`
                *,
                fest_analytics (
                    total_views,
                    total_registrations,
                    total_tickets_sold,
                    total_revenue
                )
            `)
            .in('host_id', hostIds)
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (festsError) throw festsError;

        // Format for frontend
        const formattedFests = fests.map(fest => ({
            id: fest.id,
            name: fest.fest_name,
            category: fest.fest_type,
            date: formatDateRange(fest.start_date, fest.end_date),
            time: '10:00 AM', // Default or add to schema
            venue: fest.venue,
            price: fest.is_paid ? fest.ticket_price : 0,
            image: fest.banner_url || 'assets/college-fest.jpg',
            description: fest.description,
            lineup: [], // Add later if needed
            host_college: college.name
        }));

        res.json({ 
            success: true, 
            fests: formattedFests,
            college: college.name
        });

    } catch (error) {
        console.error('Get fests by college error:', error);
        res.status(500).json({ error: 'Failed to fetch fests' });
    }
});

// Helper function
function formatDateRange(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    
    if (start === end) {
        return startDate.toLocaleDateString('en-US', options);
    }
    
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}

module.exports = router;