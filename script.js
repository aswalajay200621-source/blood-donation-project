/**
 * Aswal S Ajay — Personal Portfolio Interactions
 * Handles navigation, mobile drawer, active states, clipboard copy, and animations.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
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

  // --- 1. Sticky Header Background on Scroll ---
  const handleScroll = () => {
    const scrollY = window.scrollY || window.pageYOffset;
    
    // Header shadow & background
    if (scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Back to top button visibility
    if (scrollY > 350) {
      backToTopBtn.classList.add('show');
    } else {
      backToTopBtn.classList.remove('show');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // --- 2. Back to Top Action ---
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

    // Close on link click
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        toggleMenu(true);
      });
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!mobileNav.contains(e.target) && !mobileToggle.contains(e.target) && mobileNav.classList.contains('open')) {
        toggleMenu(true);
      }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        toggleMenu(true);
      }
    });
  }

  // --- 4. Active Navigation Observer ---
  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const activeId = entry.target.getAttribute('id');
        
        // Update desktop links
        desktopLinks.forEach(link => {
          if (link.getAttribute('href') === `#${activeId}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });

        // Update mobile links
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

  // --- 5. Copy Phone to Clipboard with Toast ---
  const showToast = (message) => {
    if (!toast) return;
    if (toastMessage) toastMessage.textContent = message;
    
    toast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  };

  if (copyPhoneBtn) {
    copyPhoneBtn.addEventListener('click', async () => {
      const textToCopy = copyPhoneBtn.getAttribute('data-copy') || '+918089848208';
      
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          // Fallback for non-https/older browsers
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
        showToast('Phone number copied to clipboard: +91 80898 48208');

        setTimeout(() => {
          if (copyTextSpan) copyTextSpan.textContent = 'Copy';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
        showToast('Could not copy automatically. Number: +91 80898 48208');
      }
    });
  }

  // --- 6. Smooth Card Entrance Animations ---
  const revealElements = document.querySelectorAll('.project-card, .skill-cat-card, .edu-card');
  revealElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.05
  });

  revealElements.forEach(el => revealObserver.observe(el));
});
