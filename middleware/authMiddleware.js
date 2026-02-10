const admin = require('../config/firebase');

const authenticateHost = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        // ✅ FIXED: Use Firebase Admin to verify token
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        const user = {
            uid: decodedToken.uid,
            email: decodedToken.email
        };

        req.user = user;

        // Check if host exists in database
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

module.exports = authenticateHost;