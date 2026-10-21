const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

// Inject Razorpay's checkout script exactly once. Resolves with the global
// `Razorpay` constructor so a dismissed/duplicated modal cannot double-load it.
export function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Payments unavailable.'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SRC}"]`);
    const script = existing || document.createElement('script');
    script.addEventListener('load', () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error('Could not start the payment gateway.'));
    });
    script.addEventListener('error', () => reject(new Error('Could not reach the payment gateway.')));
    if (!existing) {
      script.src = RAZORPAY_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}
