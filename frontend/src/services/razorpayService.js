// Load Razorpay script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Initialize Razorpay payment
const initializeRazorpay = async (options, onSuccess, onError) => {
  const res = await loadRazorpayScript();

  if (!res) {
    alert('Razorpay SDK failed to load. Please check your internet connection.');
    return;
  }

  const paymentObject = new window.Razorpay({
    ...options,
    handler: function (response) {
      onSuccess(response);
    },
    prefill: {
      name: options.prefill?.name || '',
      email: options.prefill?.email || '',
      contact: options.prefill?.contact || '',
    },
    theme: {
      color: '#3f51b5',
    },
  });

  paymentObject.on('payment.failed', function (response) {
    onError(response.error);
  });

  paymentObject.open();
};

export { loadRazorpayScript, initializeRazorpay }; 