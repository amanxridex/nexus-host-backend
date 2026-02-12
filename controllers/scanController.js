const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_BACKEND_URL = 'https://nexus-api-hkfu.onrender.com/api';

// Verify ticket
exports.verifyTicket = async (req, res) => {
    try {
        const { ticketId, festId } = req.body;
        const hostId = req.user.uid;

        // Check if ticket already scanned in host DB
        const { data: existingScan } = await supabase
            .from('scan_logs')
            .select('*')
            .eq('ticket_id', ticketId)
            .eq('fest_id', festId)
            .single();

        if (existingScan) {
            return res.json({
                success: true,
                valid: false,
                error: 'Ticket already used',
                ticket: existingScan
            });
        }

        // Verify with user backend
        try {
            const verifyRes = await axios.post(`${USER_BACKEND_URL}/tickets/verify`, {
                ticketId: ticketId,
                festId: festId
            });

            if (verifyRes.data.valid) {
                // Log valid scan
                await supabase
                    .from('scan_logs')
                    .insert({
                        host_id: hostId,
                        fest_id: festId,
                        ticket_id: ticketId,
                        attendee_name: verifyRes.data.attendee_name || 'Unknown',
                        status: 'valid',
                        scanned_at: new Date().toISOString()
                    });

                return res.json({
                    success: true,
                    valid: true,
                    ticket: verifyRes.data
                });
            } else {
                return res.json({
                    success: true,
                    valid: false,
                    error: 'Invalid ticket'
                });
            }
        } catch (err) {
            console.error('User backend error:', err.message);
            return res.json({
                success: true,
                valid: false,
                error: 'Ticket verification failed'
            });
        }

    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
};

// Get fest stats
exports.getFestStats = async (req, res) => {
    try {
        const { festId } = req.params;

        // Get scan count
        const { data: scans, error } = await supabase
            .from('scan_logs')
            .select('status')
            .eq('fest_id', festId);

        if (error) throw error;

        const validScans = scans?.filter(s => s.status === 'valid').length || 0;

        res.json({
            success: true,
            scans: { valid: validScans }
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
                attendee_name: attendeeName,
                status: 'denied',
                scanned_at: new Date().toISOString()
            });

        res.json({ success: true });

    } catch (error) {
        console.error('Log denied error:', error);
        res.status(500).json({ error: 'Failed to log' });
    }
};