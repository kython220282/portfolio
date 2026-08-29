document.addEventListener('DOMContentLoaded', function () {
  const modal = document.createElement('div');
  modal.className = 'zoom-image-modal';
  modal.setAttribute('aria-hidden', 'true');

  const modalContent = document.createElement('div');
  modalContent.className = 'zoom-image-modal__content';

  const modalImage = document.createElement('img');
  modalImage.className = 'zoom-image-modal__img';
  modalImage.alt = 'Expanded view';

  const closeButton = document.createElement('button');
  closeButton.className = 'zoom-image-modal__close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close expanded image');
  closeButton.textContent = '×';

  modalContent.appendChild(modalImage);
  modalContent.appendChild(closeButton);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  const images = document.querySelectorAll('.post-content img, .entry-content img');

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  closeButton.addEventListener('click', closeModal);

  modal.addEventListener('click', function (event) {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });

  images.forEach((image) => {
    image.style.cursor = 'zoom-in';
    image.setAttribute('tabindex', '0');
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', 'Open image in expanded view');

    const openModal = () => {
      modalImage.src = image.src;
      modalImage.alt = image.alt || 'Expanded image';
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    image.addEventListener('click', openModal);
    image.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal();
      }
    });
  });
});
