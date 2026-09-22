import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Clock, ShieldCheck } from 'lucide-react';
import PolicyPage from '../../components/PolicyPage';
import { BUSINESS, businessAddress } from '../../lib/business';

const cardClass = 'rounded-xl border border-[#231a16]/10 bg-[#F5ECDE]/60 p-6 flex items-start gap-4';

function ContactCard({ icon, title, children }) {
  return (
    <div className={cardClass}>
      <div className="w-11 h-11 rounded-full bg-[#B7322A]/10 text-[#B7322A] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-[Outfit] text-lg font-bold text-[#231A16] mb-1">{title}</h3>
        <div className="text-[#7A6A5B] text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default function ContactUs() {
  return (
    <PolicyPage
      title="Contact Us"
      intro={`We are here to help. Reach the ${BUSINESS.brandName} team using any of the details below and we will respond as quickly as possible.`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
        <ContactCard icon={<Mail size={20} />} title="Email Support">
          <a href={`mailto:${BUSINESS.email}`} className="text-[#B7322A] hover:underline">{BUSINESS.email}</a>
          <p>For orders, payments, returns and general questions.</p>
        </ContactCard>

        <ContactCard icon={<Phone size={20} />} title="Phone Support">
          <a href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`} className="text-[#B7322A] hover:underline">{BUSINESS.phone}</a>
          <p>{BUSINESS.supportHours}</p>
        </ContactCard>

        <ContactCard icon={<MapPin size={20} />} title="Registered Office">
          <p>
            {BUSINESS.legalName}
            <br />
            {businessAddress.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </p>
        </ContactCard>

        <ContactCard icon={<Clock size={20} />} title="Support Hours">
          <p>{BUSINESS.supportHours}</p>
          <p>Closed on Sundays and public holidays.</p>
        </ContactCard>
      </div>

      <h2>Grievance Officer</h2>
      <p>
        If you have a complaint that has not been resolved, you may contact our Grievance Officer:
      </p>
      <ul>
        <li>Name: {BUSINESS.grievanceOfficer.name}</li>
        <li>Email: <a href={`mailto:${BUSINESS.grievanceOfficer.email}`}>{BUSINESS.grievanceOfficer.email}</a></li>
        <li>Phone: <a href={`tel:${BUSINESS.grievanceOfficer.phone.replace(/\s/g, '')}`}>{BUSINESS.grievanceOfficer.phone}</a></li>
      </ul>

      <h2>Send us a message</h2>
      <p>
        Registered customers can send us a message from the platform. Sign in and visit the{' '}
        <Link to="/contact">Contact page</Link> to raise a query and track our reply in My Messages.
      </p>

      <h2>Business details</h2>
      <ul>
        <li>Brand: {BUSINESS.brandName}</li>
        <li>Legal entity: {BUSINESS.legalName}</li>
        <li>Website: <a href={BUSINESS.website} target="_blank" rel="noreferrer">{BUSINESS.website}</a></li>
      </ul>
      <p className="flex items-center gap-2 text-[#8A7B6B] text-xs">
        <ShieldCheck size={15} className="text-[#B7322A]" /> Payments on {BUSINESS.brandName} are processed securely by Razorpay.
      </p>
    </PolicyPage>
  );
}
