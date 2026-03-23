document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.tl-item');

  // Cards reveal when scrolling into view, collapse when scrolling past
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('tl-visible');
      } else {
        entry.target.classList.remove('tl-visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  items.forEach(item => observer.observe(item));
});
