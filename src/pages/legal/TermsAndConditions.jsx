import { Link } from 'react-router-dom';
import PolicyPage from '../../components/PolicyPage';
import { BUSINESS } from '../../lib/business';

export default function TermsAndConditions() {
  return (
    <PolicyPage
      title="Terms & Conditions"
      intro={`These Terms & Conditions ("Terms") govern your access to and use of ${BUSINESS.brandName}, an online marketplace operated by ${BUSINESS.legalName}. By creating an account, browsing, or placing an order you agree to be bound by these Terms.`}
    >
      <h2>1. Who we are</h2>
      <p>
        {BUSINESS.brandName} is a marketplace that connects buyers with independent sellers. It is operated by{' '}
        <strong>{BUSINESS.legalName}</strong>, with its registered office at {BUSINESS.address.line1}, {BUSINESS.address.line2},{' '}
        {BUSINESS.address.city}, {BUSINESS.address.state} {BUSINESS.address.postalCode}, {BUSINESS.address.country}.
      </p>

      <h2>2. Eligibility</h2>
      <ul>
        <li>You must be at least 18 years old and legally capable of entering into binding contracts.</li>
        <li>You must provide accurate, current and complete information when you register or place an order.</li>
        <li>You may use the platform only for lawful purposes and in compliance with all applicable laws of India.</li>
      </ul>

      <h2>3. Accounts</h2>
      <ul>
        <li>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.</li>
        <li>Notify us immediately at {BUSINESS.email} if you suspect unauthorised access to your account.</li>
        <li>We may suspend or terminate accounts that violate these Terms, misuse the platform, or attempt fraudulent activity.</li>
      </ul>

      <h2>4. Marketplace model</h2>
      <p>
        {BUSINESS.brandName} acts as an intermediary between buyers and sellers. Product listings are created and fulfilled by
        independent sellers. Every listing is reviewed by our team before it becomes visible in the catalogue, but the seller remains
        responsible for the accuracy, legality and quality of the products they list.
      </p>

      <h2>5. Products, pricing and availability</h2>
      <ul>
        <li>Prices are displayed in {BUSINESS.currency} and may be changed by sellers or us at any time before an order is accepted.</li>
        <li>We make reasonable efforts to display accurate product details and images, but we do not warrant that descriptions, colours or specifications are error-free.</li>
        <li>Listings are subject to availability. We may cancel an order if an item becomes unavailable or if a pricing or listing error is identified.</li>
        <li>Taxes, where applicable, are charged in accordance with Indian law.</li>
      </ul>

      <h2>6. Orders and payments</h2>
      <ul>
        <li>An order is an offer to purchase and is accepted only when we confirm it. We may refuse or cancel orders at our discretion.</li>
        <li>Payments are processed through our payment gateway partner, Razorpay. We do not store full card, UPI or netbanking credentials on our servers.</li>
        <li>By paying on {BUSINESS.brandName} you authorise the debit of the order amount and any applicable charges shown at checkout.</li>
        <li>Failed, reversed or disputed payments are handled in line with our <Link to="/refund-policy">Cancellation &amp; Refund Policy</Link>.</li>
      </ul>

      <h2>7. Shipping and delivery</h2>
      <p>
        Delivery timelines, charges and the areas we serve are described in our{' '}
        <Link to="/shipping-policy">Shipping &amp; Delivery Policy</Link>, which forms part of these Terms.
      </p>

      <h2>8. Cancellations and refunds</h2>
      <p>
        Cancellation windows, return eligibility and refund timelines are described in our{' '}
        <Link to="/refund-policy">Cancellation &amp; Refund Policy</Link>, which forms part of these Terms.
      </p>

      <h2>9. Seller obligations</h2>
      <ul>
        <li>Sellers must list only genuine, legally permitted products and must not offer prohibited or counterfeit goods.</li>
        <li>Sellers are responsible for complying with all applicable laws, including consumer protection and tax requirements.</li>
        <li>Listings that are misleading, unsafe or unlawful may be rejected or removed, and the seller account may be suspended.</li>
      </ul>

      <h2>10. Prohibited conduct</h2>
      <ul>
        <li>Posting false, abusive, obscene or defamatory content.</li>
        <li>Attempting to access accounts or data without authorisation, or interfering with the security of the platform.</li>
        <li>Using the platform to commit fraud, launder money, or violate any law.</li>
        <li>Scraping, reverse engineering or misusing the platform or its content.</li>
      </ul>

      <h2>11. Intellectual property</h2>
      <p>
        All content on the platform, including the {BUSINESS.brandName} name, logo, design and software, is owned by{' '}
        {BUSINESS.legalName} or its licensors and is protected by applicable intellectual property laws. You may not copy,
        reproduce or use it without our prior written permission.
      </p>

      <h2>12. Third-party services and links</h2>
      <p>
        The platform integrates third-party services such as Razorpay for payments and may contain links to third-party websites. We
        are not responsible for the content, policies or practices of those third parties.
      </p>

      <h2>13. Disclaimer and limitation of liability</h2>
      <p>
        The platform is provided on an "as is" and "as available" basis. To the maximum extent permitted by law,{' '}
        {BUSINESS.legalName} disclaims all warranties and shall not be liable for any indirect, incidental or consequential loss,
        or for any loss arising from the acts or omissions of sellers, delivery partners or payment providers. Our total liability
        for any claim relating to an order shall not exceed the amount paid for that order.
      </p>

      <h2>14. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless {BUSINESS.legalName}, its directors, employees and agents from any claims, losses
        or expenses arising out of your breach of these Terms or your misuse of the platform.
      </p>

      <h2>15. Suspension and termination</h2>
      <p>
        We may suspend or terminate your access to the platform, in whole or in part, if we reasonably believe you have violated
        these Terms or applicable law.
      </p>

      <h2>16. Governing law and jurisdiction</h2>
      <p>
        These Terms are governed by the laws of India. Subject to any mandatory consumer protections, the courts at{' '}
        {BUSINESS.address.city}, {BUSINESS.address.state} shall have exclusive jurisdiction over any dispute arising out of these
        Terms or your use of the platform.
      </p>

      <h2>17. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. The revised version will be posted on this page with a new "Last updated"
        date. Continued use of the platform after an update constitutes acceptance of the revised Terms.
      </p>

      <h2>18. Contact us</h2>
      <p>
        For any questions about these Terms, write to <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call{' '}
        <a href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`}>{BUSINESS.phone}</a>. You can also use our{' '}
        <Link to="/contact-us">Contact Us</Link> page.
      </p>
    </PolicyPage>
  );
}
