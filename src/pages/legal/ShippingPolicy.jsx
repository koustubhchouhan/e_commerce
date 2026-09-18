import { Link } from 'react-router-dom';
import PolicyPage from '../../components/PolicyPage';
import { BUSINESS } from '../../lib/business';

export default function ShippingPolicy() {
  return (
    <PolicyPage
      title="Shipping & Delivery Policy"
      intro={`This policy describes how products purchased on ${BUSINESS.brandName} are processed, shipped and delivered. Delivery is handled by the seller and our logistics partners.`}
    >
      <h2>1. Where we deliver</h2>
      <p>
        We currently deliver physical products across India. Digital products, where offered, are delivered electronically to the
        email address or account associated with your order. We do not ship internationally at this time.
      </p>

      <h2>2. Order processing time</h2>
      <ul>
        <li>Orders are processed after payment confirmation (or after order verification for cash-on-delivery orders, where available).</li>
        <li>Orders are typically dispatched within <strong>1 to 3 business days</strong>. Orders placed on Sundays or public holidays are processed on the next business day.</li>
        <li>Made-to-order or pre-order items may have longer dispatch times, which are stated on the product page.</li>
      </ul>

      <h2>3. Shipping charges</h2>
      <ul>
        <li>Shipping charges, if any, are shown at checkout before you pay and are based on the item, weight and delivery location.</li>
        <li>We may offer free shipping on selected products or above a minimum order value, as displayed on the platform.</li>
        <li>Any additional taxes or duties, where applicable, are disclosed at checkout.</li>
      </ul>

      <h2>4. Estimated delivery timelines</h2>
      <ul>
        <li><strong>Metro cities:</strong> typically 2 to 4 business days after dispatch.</li>
        <li><strong>Other serviceable areas:</strong> typically 4 to 7 business days after dispatch.</li>
        <li><strong>Remote or restricted locations:</strong> may take longer depending on courier coverage.</li>
      </ul>
      <p>These timelines are estimates and may vary due to weather, strikes, courier delays or other events beyond our control.</p>

      <h2>5. Order tracking</h2>
      <p>
        Once your order is dispatched, we will share tracking details with you through your registered email or phone number and in
        your Orders page. You can use the tracking reference to follow your shipment with the courier partner.
      </p>

      <h2>6. Undeliverable orders and address issues</h2>
      <ul>
        <li>Please provide a complete and accurate delivery address with a valid phone number at checkout.</li>
        <li>If delivery fails because the address is incorrect, the recipient is unavailable, or the shipment is refused, the order may be returned to the seller.</li>
        <li>In such cases, we will contact you to arrange a re-delivery or a refund, and return-shipping charges may be deducted where permitted by law.</li>
      </ul>

      <h2>7. Delivery delays</h2>
      <p>
        If your order is significantly delayed, contact us at <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> and we will
        investigate with the seller and courier partner. If the order cannot be delivered within a reasonable time, you may request
        a cancellation and refund.
      </p>

      <h2>8. Contact us</h2>
      <p>
        For shipping questions, email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call{' '}
        <a href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`}>{BUSINESS.phone}</a> ({BUSINESS.supportHours}). See also our{' '}
        <Link to="/refund-policy">Cancellation &amp; Refund Policy</Link>.
      </p>
    </PolicyPage>
  );
}
