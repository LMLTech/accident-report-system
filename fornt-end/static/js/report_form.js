document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('reportForm');

  form.addEventListener('submit', function (e) {
    const fullname = document.getElementById('fullname').value.trim();
    const cccd = document.getElementById('cccd').value.trim();
    const description = document.getElementById('description').value.trim();
    const location = document.getElementById('location').value.trim();
    const image = document.getElementById('image').files[0];

    if (!fullname || !cccd || !description || !location || !image) {
      alert("Vui lòng điền đầy đủ thông tin và chọn ảnh!");
      e.preventDefault();
    }
  });
});
