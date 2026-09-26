/**
 * Aswal S Ajay — Personal Portfolio Interactions
 * Minimal, lightweight vanilla JavaScript for header states, mobile drawer,
 * active link tracking, and clipboard phone copy.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const header = document.getElementById('site-header');
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');
  const desktopLinks = document.querySelectorAll('.nav-link');
  const backToTopBtn = document.getElementById('back-to-top');
  const copyPhoneBtn = document.getElementById('copy-phone-btn');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const sections = document.querySelectorAll('section[id]');

  let toastTimeout = null;

  // --- 1. Sticky Header & Back to Top on Scroll ---
  const handleScroll = () => {
    const scrollY = window.scrollY || window.pageYOffset;
    
    if (header) {
      if (scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    if (backToTopBtn) {
      if (scrollY > 300) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // --- 2. Back to Top Click ---
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // --- 3. Mobile Navigation Drawer ---
  if (mobileToggle && mobileNav) {
    const toggleMenu = (forceClose = false) => {
      const isOpen = forceClose ? false : !mobileNav.classList.contains('open');
      mobileNav.classList.toggle('open', isOpen);
      mobileToggle.classList.toggle('is-active', isOpen);
      mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      mobileNav.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    };

    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        toggleMenu(true);
      });
    });

    document.addEventListener('click', (e) => {
      if (!mobileNav.contains(e.target) && !mobileToggle.contains(e.target) && mobileNav.classList.contains('open')) {
        toggleMenu(true);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        toggleMenu(true);
      }
    });
  }

  // --- 4. Active Navigation State ---
  if ('IntersectionObserver' in window && sections.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: '-25% 0px -55% 0px',
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const activeId = entry.target.getAttribute('id');
          
          desktopLinks.forEach(link => {
            if (link.getAttribute('href') === `#${activeId}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });

          mobileLinks.forEach(link => {
            if (link.getAttribute('href') === `#${activeId}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => sectionObserver.observe(section));
  }

  // --- 5. Copy Phone Number to Clipboard with Toast ---
  const showToast = (message) => {
    if (!toast) return;
    if (toastMessage) toastMessage.textContent = message;
    
    toast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  };

  if (copyPhoneBtn) {
    copyPhoneBtn.addEventListener('click', async () => {
      const textToCopy = copyPhoneBtn.getAttribute('data-copy') || '+918089848208';
      
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = textToCopy;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }

        const copyTextSpan = copyPhoneBtn.querySelector('.copy-text');
        if (copyTextSpan) copyTextSpan.textContent = 'Copied!';
        showToast('Phone number copied to clipboard');

        setTimeout(() => {
          if (copyTextSpan) copyTextSpan.textContent = 'Copy';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
        showToast('Number: +91 80898 48208');
      }
    });
  }
});
