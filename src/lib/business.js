// Central business/legal details used across the public policy pages.
//
// IMPORTANT: replace every placeholder below with your real registered
// details before submitting the website to Razorpay for merchant
// verification. Razorpay reviews these pages and the contact information on
// them, so the name, address, phone number and email must match your KYC.
export const BUSINESS = {
  brandName: 'Arghya',
  legalName: 'Arghya Technologies Private Limited',
  website: 'https://novamarket.in',
  email: 'rahulsinghal0993@gmail.com',
  phone: '+91 8955746038',
  supportHours: 'Monday to Friday, 10:00 AM to 6:00 PM IST',
  address: {
    line1: 'Sector 1',
    line2: 'Pinzarapole Gaushala, Gaytri Nagar',
    city: 'Jaipur',
    state: 'Rajasthan',
    postalCode: '302033',
    country: 'India',
  },
  grievanceOfficer: {
    name: 'Grievance Officer',
    email: 'rahulsinghal0993@gmail.com',
    phone: '+91 8955746038',
  },
  currency: 'INR (₹)',
  // Date shown as "Last updated" on every policy page.
  effectiveDate: '18 September 2026',
};

export const POLICY_LINKS = [
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/refund-policy', label: 'Cancellation & Refund Policy' },
  { to: '/shipping-policy', label: 'Shipping & Delivery Policy' },
  { to: '/contact-us', label: 'Contact Us' },
];

export const businessAddress = [
  BUSINESS.address.line1,
  BUSINESS.address.line2,
  `${BUSINESS.address.city}, ${BUSINESS.address.state} ${BUSINESS.address.postalCode}`,
  BUSINESS.address.country,
];
