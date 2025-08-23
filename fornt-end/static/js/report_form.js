document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('reportForm');
  const getLocationBtn = document.getElementById('get-location-btn');
  const locationInput = document.getElementById('location');
  const latInput = document.getElementById('lat');
  const lngInput = document.getElementById('lng');

  // Xử lý sự kiện khi người dùng nhấp vào nút "Lấy vị trí"
  getLocationBtn.addEventListener('click', function () {
    if ("geolocation" in navigator) {
      // Yêu cầu vị trí hiện tại
      navigator.geolocation.getCurrentPosition(function (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Cập nhật giá trị vào các trường input
        locationInput.value = `${lat}, ${lng}`;
        latInput.value = lat;
        lngInput.value = lng;
        alert("Đã cập nhật vị trí hiện tại!");
      }, function (error) {
        // Xử lý lỗi
        alert("Không thể lấy vị trí hiện tại. Vui lòng nhập thủ công. Lỗi: " + error.message);
      });
    } else {
      alert("Trình duyệt của bạn không hỗ trợ Geolocation API.");
    }
  });

  form.addEventListener('submit', function (e) {
    const name = document.getElementById('name').value.trim();
    const cccd = document.getElementById('cccd').value.trim();
    const description = document.getElementById('description').value.trim();
    const location = locationInput.value.trim();
    const image = document.getElementById('image').files[0];
    
    // Kiểm tra các trường bắt buộc
    if (!name || !cccd || !description || !location || !image) {
      alert("Vui lòng điền đầy đủ thông tin và chọn ảnh!");
      e.preventDefault();
      return;
    }

    // Đã có tọa độ từ nút bấm, không cần gán tọa độ giả định nữa.
    // Nếu người dùng không sử dụng nút, giá trị lat/lng sẽ là rỗng
    // và sẽ được xử lý trên server hoặc ở đây.
    
    // Bạn có thể thêm một bước kiểm tra nữa nếu muốn
    if (!latInput.value || !lngInput.value) {
        // Trường hợp người dùng nhập vị trí thủ công, nhưng không có tọa độ
        // Bạn có thể xử lý ở đây hoặc để server xử lý
    }
  });
});