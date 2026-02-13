const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_BACKEND_URL = 'https://nexus-api-hkfu.onrender.com/api';

exports.verifyTicket = async (req, res) => {
    try {
        const { ticketId, festId } = req.body;
        const hostId = req.user.uid;

        console.log('🔍 Verifying ticket:', { ticketId, festId, hostId });

        // Step 1: Check if already scanned in OUR database
        const { data: existingScan, error: scanError } = await supabase
            .from('scan_logs')
            .select('*')
            .eq('ticket_id', ticketId)
            .eq('fest_id', festId)
            .maybeSingle();

        if (scanError) {
            console.error('❌ Scan check error:', scanError);
            throw scanError;
        }

        console.log('📋 Existing scan:', existingScan);

        if (existingScan) {
            console.log('⚠️ Ticket already scanned');
            return res.json({
                success: true,
                valid: false,
                error: 'Ticket already used',
                ticket: existingScan
            });
        }

        // Step 2: Verify with user backend (with timeout)
        let verifyData;
        try {
            console.log('🌐 Calling user backend...');
            const verifyRes = await axios.post(
                `${USER_BACKEND_URL}/tickets/verify`,
                { ticketId, festId },
                { 
                    timeout: 8000,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            verifyData = verifyRes.data;
            console.log('✅ User backend response:', verifyData);
        } catch (err) {
            console.error('❌ User backend error:', err.message, err.response?.status);
            
            // If 429 or any error, DON'T mark as used - show error instead
            if (err.response?.status === 429) {
                return res.status(429).json({
                    success: false,
                    error: 'Server busy. Please try again in a few seconds.'
                });
            }
            
            // For other errors, create scan entry anyway (offline mode)
            console.log('⚠️ User backend failed, using offline mode');
            verifyData = { 
                valid: true, 
                attendee_name: 'Guest',
                offline: true 
            };
        }

        // Step 3: If valid, create scan log
        if (verifyData.valid) {
            console.log('📝 Creating scan log...');
            
            const { data: newScan, error: insertError } = await supabase
                .from('scan_logs')
                .insert({
                    host_id: hostId,
                    fest_id: festId,
                    ticket_id: ticketId,
                    attendee_name: verifyData.attendee_name || verifyData.name || 'Guest',
                    status: 'valid',
                    scanned_at: new Date().toISOString()
                })
                .select()
                .single();

            if (insertError) {
                console.error('❌ Insert error:', insertError);
                throw insertError;
            }

            console.log('✅ Scan created:', newScan);

            return res.json({
                success: true,
                valid: true,
                ticket: newScan,
                offline: verifyData.offline || false
            });
        } else {
            return res.json({
                success: true,
                valid: false,
                error: 'Invalid ticket'
            });
        }

    } catch (error) {
        console.error('💥 Verify error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Verification failed', 
            details: error.message 
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