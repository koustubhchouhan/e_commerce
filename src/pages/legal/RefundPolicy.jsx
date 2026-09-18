import { Link } from 'react-router-dom';
import PolicyPage from '../../components/PolicyPage';
import { BUSINESS } from '../../lib/business';

export default function RefundPolicy() {
  return (
    <PolicyPage
      title="Cancellation & Refund Policy"
      intro={`This policy explains how order cancellations, returns and refunds work on ${BUSINESS.brandName}, operated by ${BUSINESS.legalName}. It applies to all purchases made through the platform.`}
    >
      <h2>1. Order cancellation by the customer</h2>
      <ul>
        <li>You may request cancellation free of charge any time before your order is shipped, from your Orders page or by emailing <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> with your order number.</li>
        <li>Once an order has been shipped, it can no longer be cancelled; you may instead follow the returns process below (where eligible).</li>
        <li>If a cancellation is accepted, any amount already paid is refunded to the original payment method as described in section 5.</li>
      </ul>

      <h2>2. Cancellation by the seller or by us</h2>
      <p>
        We or the seller may cancel an order if the item is unavailable, if there is a pricing or listing error, if the delivery
        address is not serviceable, or if we suspect fraudulent activity. If this happens, you will be notified and any amount paid
        will be refunded in full.
      </p>

      <h2>3. Returns</h2>
      <ul>
        <li>Most physical products can be returned within <strong>7 days</strong> of delivery if they are unused, undamaged and returned with their original packaging, tags, accessories and invoice.</li>
        <li>To start a return, email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> with your order number, the reason, and photographs of the item and packaging where relevant.</li>
        <li>Once approved, we will arrange a pickup or provide return instructions. Please do not ship items back without an approved return request.</li>
        <li>Certain items are not returnable for hygiene, safety or licensing reasons, including opened software or digital products, consumables, and personalised or made-to-order items.</li>
      </ul>

      <h2>4. Damaged, defective or wrong items</h2>
      <p>
        If you receive a damaged, defective or incorrect item, contact us within <strong>48 hours</strong> of delivery with your order
        number and photographs. We will arrange a replacement or a full refund, including any shipping charges paid, at no cost to
        you.
      </p>

      <h2>5. Refunds and timelines</h2>
      <ul>
        <li>Approved refunds are credited to the <strong>original payment method</strong> used at checkout (for example, UPI, card, netbanking or wallet) through our payment partner Razorpay.</li>
        <li>Refunds are initiated within <strong>2 business days</strong> of an approved cancellation or return.</li>
        <li>Once initiated, refunds typically reflect in your account within <strong>5 to 7 business days</strong>; your bank or payment provider may take additional time.</li>
        <li>For cash-on-delivery orders (where available), refunds are made via a bank transfer to the account details you provide.</li>
      </ul>

      <h2>6. Failed or deducted payments</h2>
      <p>
        If an amount is deducted but your order is not confirmed, or a payment fails mid-transaction, the amount is usually reversed
        automatically by your bank or payment provider within 5 to 7 business days. If it is not, contact us with the payment
        reference and we will coordinate with Razorpay to resolve it.
      </p>

      <h2>7. Non-refundable cases</h2>
      <ul>
        <li>Products returned without an approved return request or outside the return window.</li>
        <li>Items that are used, damaged or missing parts due to customer handling.</li>
        <li>Non-returnable categories listed in section 3.</li>
        <li>Delays caused solely by incorrect or incomplete delivery information provided by the customer.</li>
      </ul>

      <h2>8. Disputes and grievances</h2>
      <p>
        If you are unsatisfied with a refund decision, email <a href={`mailto:${BUSINESS.grievanceOfficer.email}`}>{BUSINESS.grievanceOfficer.email}</a>{' '}
        and we will review your case. Please include your order number and any supporting details.
      </p>

      <h2>9. Contact us</h2>
      <p>
        For any cancellation or refund question, email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call{' '}
        <a href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`}>{BUSINESS.phone}</a> ({BUSINESS.supportHours}). You can also use our{' '}
        <Link to="/contact-us">Contact Us</Link> page. See also our <Link to="/shipping-policy">Shipping &amp; Delivery Policy</Link>.
      </p>
    </PolicyPage>
  );
}
