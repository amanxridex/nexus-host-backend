const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_BACKEND_URL = 'https://nexus-api-hkfu.onrender.com/api';

// Simple in-memory cache for ticket verification
const ticketCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Verify with retry logic
async function verifyWithUserBackend(ticketId, festId, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const verifyRes = await axios.post(
                `${USER_BACKEND_URL}/tickets/verify`,
                { ticketId, festId },
                { timeout: 5000 } // 5 second timeout
            );
            return verifyRes.data;
        } catch (err) {
            if (err.response?.status === 429) {
                // Rate limited - wait and retry
                console.log(`Rate limited, retry ${i + 1}/${retries}...`);
                await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 1s, 2s, 3s delay
                continue;
            }
            throw err;
        }
    }
    throw new Error('Max retries reached');
}

exports.verifyTicket = async (req, res) => {
    try {
        const { ticketId, festId } = req.body;
        const hostId = req.user.uid;

        // Check cache first
        const cacheKey = `${festId}:${ticketId}`;
        const cached = ticketCache.get(cacheKey);
        if (cached && Date.now() - cached.time < CACHE_TTL) {
            return res.json(cached.data);
        }

        // Check if already scanned in host DB
        const { data: existingScan } = await supabase
            .from('scan_logs')
            .select('*')
            .eq('ticket_id', ticketId)
            .eq('fest_id', festId)
            .maybeSingle();

        if (existingScan) {
            const result = {
                success: true,
                valid: false,
                error: 'Ticket already used',
                ticket: existingScan
            };
            ticketCache.set(cacheKey, { data: result, time: Date.now() });
            return res.json(result);
        }

        // Verify with user backend (with retry)
        try {
            const verifyData = await verifyWithUserBackend(ticketId, festId);

            if (verifyData.valid) {
                // Log valid scan
                const { data: newScan, error } = await supabase
                    .from('scan_logs')
                    .insert({
                        host_id: hostId,
                        fest_id: festId,
                        ticket_id: ticketId,
                        attendee_name: verifyData.attendee_name || verifyData.name || 'Unknown',
                        status: 'valid',
                        scanned_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) throw error;

                const result = {
                    success: true,
                    valid: true,
                    ticket: { ...verifyData, scan_id: newScan?.id }
                };
                ticketCache.set(cacheKey, { data: result, time: Date.now() });
                return res.json(result);
            } else {
                const result = {
                    success: true,
                    valid: false,
                    error: 'Invalid ticket'
                };
                return res.json(result);
            }
        } catch (err) {
            console.error('User backend error:', err.message);
            
            // If 429, tell user to retry
            if (err.message.includes('429') || err.response?.status === 429) {
                return res.status(429).json({
                    success: false,
                    error: 'Too many requests. Please wait a moment and try again.'
                });
            }

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

        const { data: scans, error } = await supabase
            .from('scan_logs')
            .select('status')
            .eq('fest_id', festId);

        if (error) throw error;

        const validScans = scans?.filter(s => s.status === 'valid').length || 0;
        const deniedScans = scans?.filter(s => s.status === 'denied').length || 0;

        res.json({
            success: true,
            scans: { valid: validScans, denied: deniedScans, total: scans?.length || 0 }
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