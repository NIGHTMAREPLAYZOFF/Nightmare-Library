/**
 * Toast notification component
 * @param {string} message - Message to display
 * @param {string} type - 'error' or 'success'
 */
export const showToast = (message, type = 'error') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};
