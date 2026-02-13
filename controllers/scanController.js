const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ FIXED: No trailing space
const USER_BACKEND_URL = 'https://nexus-api-hkfu.onrender.com/api';

exports.verifyTicket = async (req, res) => {
    try {
        const { ticketId, festId } = req.body;
        const hostId = req.user.uid;

        console.log('🔍 Verifying:', { ticketId, festId });

        // Step 1: Check if already scanned in host DB
        const { data: existingScan } = await supabase
            .from('scan_logs')
            .select('*')
            .eq('ticket_id', ticketId)
            .eq('fest_id', festId)
            .maybeSingle();

        if (existingScan) {
            return res.json({
                success: true,
                valid: false,
                error: 'Ticket already used',
                ticket: existingScan
            });
        }

        // Step 2: ✅ MUST verify from user backend - NO OFFLINE MODE
        let ticketDetails = null;
        
        try {
            console.log('🌐 Verifying with user backend...');
            
            const ticketRes = await axios.get(
                `${USER_BACKEND_URL}/tickets/by-ticket-id/${ticketId}`,
                { 
                    timeout: 8000,
                    headers: { 'Authorization': req.headers.authorization }
                }
            );
            
            ticketDetails = ticketRes.data;
            console.log('✅ Ticket found:', ticketDetails);

        } catch (err) {
            console.error('❌ Invalid ticket:', err.message);
            
            // ✅ REJECT if user backend fails or ticket not found
            return res.json({
                success: true,
                valid: false,
                error: 'Invalid ticket - Not found in system'
            });
        }

        // Step 3: ✅ Check if ticket belongs to this fest
        if (ticketDetails.fest_id !== festId) {
            return res.json({
                success: true,
                valid: false,
                error: 'Ticket not valid for this event'
            });
        }

        // Step 4: ✅ Check if already used
        if (ticketDetails.used_at) {
            return res.json({
                success: true,
                valid: false,
                error: 'Ticket already used',
                used_at: ticketDetails.used_at
            });
        }

        // Step 5: Create scan log (only for valid tickets)
        const attendeeName = ticketDetails.attendee_name 
            || ticketDetails.name 
            || ticketDetails.user?.name
            || 'Guest';

        const { data: newScan, error: insertError } = await supabase
            .from('scan_logs')
            .insert({
                host_id: hostId,
                fest_id: festId,
                ticket_id: ticketId,
                attendee_name: attendeeName,
                status: 'valid',
                scanned_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) throw insertError;

        console.log('✅ Scan created:', newScan);

        // Step 6: Mark as used in user backend
        try {
            await axios.patch(
                `${USER_BACKEND_URL}/tickets/${ticketId}/mark-used`,
                { 
                    used_at: new Date().toISOString(),
                    scanned_by: hostId 
                },
                { 
                    timeout: 5000,
                    headers: { 'Authorization': req.headers.authorization }
                }
            );
            console.log('✅ Marked as used');
        } catch (updateErr) {
            console.error('⚠️ Failed to mark used:', updateErr.message);
        }

        res.json({
            success: true,
            valid: true,
            ticket: newScan
        });

    } catch (error) {
        console.error('💥 Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Verification failed'
        });
    }
};

// Get fest stats
exports.getFestStats = async (req, res) => {
    try {
        const { festId } = req.params;

        const { data: scans, error } = await supabase
            .from('scan_logs')
            .select('status')
            .eq('fest_id', festId);

        if (error) throw error;

        const validScans = scans?.filter(s => s.status === 'valid').length || 0;
        const deniedScans = scans?.filter(s => s.status === 'denied').length || 0;

        res.json({
            success: true,
            scans: { 
                valid: validScans, 
                denied: deniedScans, 
                total: scans?.length || 0 
            }
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
};

// Get recent scans
exports.getRecentScans = async (req, res) => {
    try {
        const { festId } = req.params;

        const { data: scans, error } = await supabase
            .from('scan_logs')
            .select('*')
            .eq('fest_id', festId)
            .order('scanned_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        res.json({
            success: true,
            scans: scans || []
        });

    } catch (error) {
        console.error('Recent scans error:', error);
        res.status(500).json({ error: 'Failed to get scans' });
    }
};

// Log denied entry
exports.logDenied = async (req, res) => {
    try {
        const { ticketId, festId, attendeeName } = req.body;
        const hostId = req.user.uid;

        await supabase
            .from('scan_logs')
            .insert({
                host_id: hostId,
                fest_id: festId,
                ticket_id: ticketId,
                attendee_name: attendeeName || 'Unknown',
                status: 'denied',
                scanned_at: new Date().toISOString()
            });

        res.json({ success: true });

    } catch (error) {
        console.error('Log denied error:', error);
        res.status(500).json({ error: 'Failed to log' });
    }
};