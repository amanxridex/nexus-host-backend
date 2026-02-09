exports.generateReferralCode = (name) => {
  const clean = name.replace(/\s+/g, '').toUpperCase().substring(0, 6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${clean}${random}`;
};

exports.formatPhone = (phone) => {
  // Format Indian phone numbers
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return '+' + cleaned;
};