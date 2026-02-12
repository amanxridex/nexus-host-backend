const axios = require('axios');

const USER_BACKEND_URL = 'https://nexus-api-hkfu.onrender.com/api';

// Verify ticket by scanning QR
exports.verifyTicket = async (req, res) => {
    try {
        const { ticketId, festId } = req.body;
        const hostId = req.user.uid; // From Firebase auth middleware
        
        // Verify this fest belongs to host
        const { data: fest, error: festError } = await supabase
            .from('fests')
            .select('*')
            .eq('id', festId)
            .eq('host_id', hostId)
            .single();
            
        if (festError || !fest) {
            return res.status(403).json({ success: false, error: 'Not your event' });
        }
        
        // Call user backend to verify ticket
        const verifyResponse = await axios.post(
            `${USER_BACKEND_URL}/booking/verify-ticket/${ticketId}`,
            { festId }
        );
        
        if (!verifyResponse.data.success) {
            return res.status(400).json(verifyResponse.data);
        }
        
        const ticket = verifyResponse.data.ticket;
        
        // Log scan in host DB
        await supabase
            .from('scan_logs')
            .insert({
                host_id: hostId,
                fest_id: festId,
                ticket_id: ticketId,
                attendee_name: ticket.attendee_name,
                status: ticket.is_used ? 'already_used' : 'valid',
                scanned_at: new Date().toISOString()
            });
        
        // If valid and not used, mark as used in user DB
        if (!ticket.is_used) {
            await axios.post(
                `${USER_BACKEND_URL}/booking/mark-used/${ticketId}`
            );
        }
        
        res.json({
            success: true,
            valid: !ticket.is_used,
            ticket: ticket,
            message: ticket.is_used ? 'Already used' : 'Valid entry'
        });
        
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
};

// Get fest stats
exports.getFestStats = async (req, res) => {
    try {
        const { festId } = req.params;
        const hostId = req.user.uid;
        
        // Verify fest belongs to host
        const { data: fest } = await supabase
            .from('fests')
            .select('*')
            .eq('id', festId)
            .eq('host_id', hostId)
            .single();
        
        if (!fest) {
            return res.status(403).json({ error: 'Not your event' });
        }
        
        // Get scan stats from host DB
        const { data: scans, error: scanError } = await supabase
            .from('scan_logs')
            .select('*')
            .eq('fest_id', festId);
        
        res.json({
            success: true,
            fest: fest,
            scans: {
                total: scans?.length || 0,
                valid: scans?.filter(s => s.status === 'valid').length || 0,
                already_used: scans?.filter(s => s.status === 'already_used').length || 0
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
        const hostId = req.user.uid;
        
        const { data: scans } = await supabase
            .from('scan_logs')
            .select('*')
            .eq('fest_id', festId)
            .eq('host_id', hostId)
            .order('scanned_at', { ascending: false })
            .limit(20);
        
        res.json({ success: true, scans: scans || [] });
        
    } catch (error) {
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
        res.status(500).json({ error: 'Failed to log' });
    }
};