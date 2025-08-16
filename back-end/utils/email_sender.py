# email_sender.py
import smtplib 
from email.message import EmailMessage 
import os

def send_emergency_email(name, location, description, image_path):  # Hàm gửi email thông báo tai nạn
    msg = EmailMessage()
    msg["Subject"] = f"[KHẨN CẤP] Tai nạn giao thông {location}"
    msg["From"] = os.getenv("EMAIL_SENDER")

    # Lấy danh sách email từ biến môi trường
    receiver_string = os.getenv("EMAIL_RECEIVERS")
    
    # Kiểm tra nếu biến môi trường tồn tại và không rỗng
    if not receiver_string:
        print("Lỗi: Không tìm thấy địa chỉ email người nhận. Vui lòng kiểm tra lại biến EMAIL_RECEIVERS trong file .env")
        return # Thoát hàm nếu không có người nhận

    receivers = [email.strip() for email in receiver_string.split(',')]
    msg["To"] = ", ".join(receivers)  # Gán danh sách địa chỉ vào trường To
    
    msg.set_content(f"Có tai nạn được thông báo bởi người tên là: {name}\n\nMô tả: {description}\n\nVị trí: {location}")

    # Thêm ảnh vào email với xử lý lỗi
    try:
        if image_path and os.path.exists(image_path):
            with open(image_path, 'rb') as f:
                img_data = f.read()
                msg.add_attachment(img_data, maintype='image', subtype='jpeg', filename=os.path.basename(image_path))
            print(f"Đã đính kèm ảnh thành công từ đường dẫn: {image_path}")
    except FileNotFoundError:
        print(f"Lỗi: Không tìm thấy tệp ảnh tại đường dẫn {image_path}. Email sẽ được gửi mà không có ảnh.")
    except Exception as e:
        print(f"Lỗi không xác định khi đính kèm ảnh: {e}. Email sẽ được gửi mà không có ảnh.")

    # Gửi mail với xử lý lỗi
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(os.getenv("EMAIL_SENDER"), os.getenv("EMAIL_PASSWORD"))
            smtp.send_message(msg)
        print("Email đã được gửi thành công.")
    except Exception as e:
        print(f"Đã xảy ra lỗi khi gửi email: {e}")