document.addEventListener('DOMContentLoaded', function () {
  // Tạo hiệu ứng nhấp nháy icon thành công
  const icon = document.querySelector('.success-icon');
  if (icon) {
    icon.style.transition = "transform 0.6s ease";
    setInterval(() => {
      icon.style.transform = "scale(1.1)";
      setTimeout(() => {
        icon.style.transform = "scale(1)";
      }, 300);
    }, 1000);
  }
});
