const admin = require('../config/firebase');
const jwt = require('jsonwebtoken');

// ✅ NEW: Verify host session cookie (INDEPENDENT from user backend)
const verifyHostSession = async (req, res, next) => {
    try {
        const token = req.cookies.host_session; // ✅ host_session (not nexus_session)
        
        if (!token) {
            // Fallback to old Firebase token for backward compatibility
            return authenticateHost(req, res, next);
        }

        // Verify JWT session token (HOST's own secret)
        const decoded = jwt.verify(token, process.env.HOST_COOKIE_SECRET); // ✅ HOST_COOKIE_SECRET
        
        req.user = {
            uid: decoded.uid,
            email: decoded.email || null
        };

        // Check if host exists in database
        const supabase = require('../config/database');
        const { data: host, error: hostError } = await supabase
            .from('hosts')
            .select('*')
            .eq('firebase_uid', decoded.uid)
            .single();

        if (host && !hostError) {
            req.host = host;
        }

        next();
        
    } catch (error) {
        console.error('Host session verification failed:', error);
        // Fallback to Firebase token
        return authenticateHost(req, res, next);
    }
};

// ✅ OLD: Firebase token verification (keep for fallback)
const authenticateHost = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        const user = {
            uid: decodedToken.uid,
            email: decodedToken.email
        };

        req.user = user;

        const supabase = require('../config/database');
        const { data: host, error: hostError } = await supabase
            .from('hosts')
            .select('*')
            .eq('firebase_uid', user.uid)
            .single();

        if (host && !hostError) {
            req.host = host;
        }

        next();
        
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = { verifyHostSession, authenticateHost };