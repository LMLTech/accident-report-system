// fornt-end/static/js/login_admin.js

document.addEventListener('DOMContentLoaded', () => {
    // Lấy form đăng nhập
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
        // Thêm sự kiện lắng nghe khi form được gửi
        loginForm.addEventListener('submit', (event) => {
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');

            // Kiểm tra xem các trường có trống không
            if (!usernameInput.value || !passwordInput.value) {
                // Hiển thị một alert đơn giản (có thể thay bằng modal đẹp hơn)
                // alert('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.');
                
                // Ngăn form gửi đi nếu dữ liệu không hợp lệ
                event.preventDefault(); 
            }
        });
    }
});
