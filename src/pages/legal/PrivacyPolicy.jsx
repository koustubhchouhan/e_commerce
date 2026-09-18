import { Link } from 'react-router-dom';
import PolicyPage from '../../components/PolicyPage';
import { BUSINESS } from '../../lib/business';

export default function PrivacyPolicy() {
  return (
    <PolicyPage
      title="Privacy Policy"
      intro={`This Privacy Policy explains how ${BUSINESS.legalName} ("we", "us") collects, uses, shares and protects your personal data when you use ${BUSINESS.brandName}. We handle personal data in accordance with applicable Indian law, including the Digital Personal Data Protection Act, 2023.`}
    >
      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your name, email address, phone number, password (stored in hashed form) and account role.</li>
        <li><strong>Profile data:</strong> profile photo and details you choose to add.</li>
        <li><strong>Order data:</strong> items purchased, shipping address, order history and communication about your orders.</li>
        <li><strong>Payment data:</strong> we receive limited transaction details (such as payment status, method type and a Razorpay payment identifier). We do not store your full card number, CVV, UPI PIN or netbanking credentials.</li>
        <li><strong>Usage and device data:</strong> IP address, browser type, pages viewed and similar technical information collected through cookies and session tokens.</li>
        <li><strong>Messages:</strong> content you submit through contact forms, reviews and messages to sellers or support.</li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To create and manage your account and provide the marketplace services.</li>
        <li>To process orders, route them to the relevant sellers, and arrange delivery.</li>
        <li>To process payments and prevent fraudulent transactions.</li>
        <li>To provide customer support and respond to your requests and complaints.</li>
        <li>To personalise your experience and improve our products and services.</li>
        <li>To send transactional notifications and, where permitted, service updates.</li>
        <li>To comply with legal, tax and regulatory obligations.</li>
      </ul>

      <h2>3. Consent and legal grounds</h2>
      <p>
        We process your personal data on the basis of your consent, to perform our contract with you (for example, to fulfil an
        order), and to comply with legal obligations. You may withdraw consent at any time by contacting us, though this may affect
        our ability to provide certain services.
      </p>

      <h2>4. Sharing your information</h2>
      <ul>
        <li><strong>Sellers:</strong> we share the order and delivery details needed to fulfil your purchase.</li>
        <li><strong>Payment partners:</strong> Razorpay processes your payments and receives the data necessary to complete the transaction.</li>
        <li><strong>Service providers:</strong> hosting, database and communication providers who process data on our instructions.</li>
        <li><strong>Delivery partners:</strong> your name, address and phone number are shared with logistics partners for delivery.</li>
        <li><strong>Legal authorities:</strong> where required by law, court order or to protect our rights and users.</li>
        <li><strong>Business transfers:</strong> in connection with a merger, acquisition or sale of assets, subject to this Policy.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>5. Cookies and sessions</h2>
      <p>
        We use essential cookies to keep you signed in and to secure your session. These cookies are HttpOnly and are used for
        authentication and security. You can control cookies through your browser settings, but disabling essential cookies may
        prevent you from using the platform.
      </p>

      <h2>6. Data retention</h2>
      <p>
        We retain personal data for as long as your account is active and for the period necessary to fulfil the purposes described
        in this Policy, including to comply with legal, tax, accounting and dispute-resolution requirements. When data is no longer
        needed, we delete or anonymise it.
      </p>

      <h2>7. Security</h2>
      <p>
        We use reasonable technical and organisational measures, including encryption in transit, access controls and hashed
        passwords, to protect your data. No method of transmission or storage is completely secure, so we cannot guarantee absolute
        security.
      </p>

      <h2>8. Your rights</h2>
      <ul>
        <li>Access and obtain a copy of the personal data we hold about you.</li>
        <li>Correct or update inaccurate or incomplete data.</li>
        <li>Request deletion of your data, subject to legal retention requirements.</li>
        <li>Withdraw consent or object to certain processing.</li>
        <li>Raise a grievance with our Grievance Officer (details below).</li>
      </ul>
      <p>
        To exercise these rights, email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. We will respond within the
        timeframe required by applicable law.
      </p>

      <h2>9. Children</h2>
      <p>
        The platform is not intended for children under 18. We do not knowingly collect personal data from children. If you believe
        a child has provided us data, contact us and we will delete it.
      </p>

      <h2>10. International transfers</h2>
      <p>
        Your data may be processed and stored on servers located outside your state or country, including by our cloud and payment
        providers. We take steps to ensure such transfers are protected by appropriate safeguards.
      </p>

      <h2>11. Grievance Officer</h2>
      <p>
        In accordance with applicable law, the contact details of our Grievance Officer are:
      </p>
      <ul>
        <li>Name: {BUSINESS.grievanceOfficer.name}</li>
        <li>Email: <a href={`mailto:${BUSINESS.grievanceOfficer.email}`}>{BUSINESS.grievanceOfficer.email}</a></li>
        <li>Phone: <a href={`tel:${BUSINESS.grievanceOfficer.phone.replace(/\s/g, '')}`}>{BUSINESS.grievanceOfficer.phone}</a></li>
        <li>Address: {BUSINESS.address.line1}, {BUSINESS.address.line2}, {BUSINESS.address.city}, {BUSINESS.address.state} {BUSINESS.address.postalCode}, {BUSINESS.address.country}</li>
      </ul>

      <h2>12. Changes to this Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The revised version will be posted on this page with a new "Last
        updated" date.
      </p>

      <h2>13. Contact us</h2>
      <p>
        For privacy questions, email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or reach us through our{' '}
        <Link to="/contact-us">Contact Us</Link> page.
      </p>
    </PolicyPage>
  );
}
