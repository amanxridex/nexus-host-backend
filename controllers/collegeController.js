const supabase = require('../config/database');

// Get all colleges
exports.getColleges = async (req, res) => {
  try {
    const { search, city, state } = req.query;
    
    let query = supabase
      .from('colleges')
      .select('*')
      .eq('is_verified', true)
      .order('name');

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (city) {
      query = query.eq('city', city);
    }

    if (state) {
      query = query.eq('state', state);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Suggest new college
exports.suggestCollege = async (req, res) => {
  try {
    const { name, short_name, city, state } = req.body;

    const { data, error } = await supabase
      .from('colleges')
      .insert({
        name,
        short_name,
        city,
        state,
        is_verified: false
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'College suggestion submitted for review',
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get unique cities/states for filters
exports.getLocations = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('colleges')
      .select('city, state')
      .eq('is_verified', true);

    if (error) throw error;

    const cities = [...new Set(data.map(c => c.city))].sort();
    const states = [...new Set(data.map(c => c.state))].sort();

    res.json({
      success: true,
      cities,
      states
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};