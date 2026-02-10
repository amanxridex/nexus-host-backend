const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const authenticateHost = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;

        const { data: host, error: hostError } = await supabase
            .from('hosts')
            .select('*')
            .eq('firebase_uid', user.id)
            .single();

        if (host && !hostError) {
            req.host = host;
        }

        next();
        
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = authenticateHost;