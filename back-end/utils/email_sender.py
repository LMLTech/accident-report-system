import smtplib 
from email.message import EmailMessage 
import os

def send_emergency_email(name, location, description, image_path):  # Hàm gửi email thông báo tai nạn
    msg = EmailMessage()
    msg["Subject"] = f"[KHẨN CẤP] Tai nạn giao thông {location}"
    msg["From"] = os.getenv("EMAIL_SENDER")   # Lấy email người gửi từ biến môi trường
    msg["To"] = os.getenv("EMAIL_RECEIVERS")  # Lấy danh sách email từ biến môi trường

    msg.set_content(f"Có tai nạn được thông báo bởi người tên là: {name}\n\nMô tả: {description}\n\nVị trí: {location}")

    with open(image_path, 'rb') as f:
        img_data = f.read()
        msg.add_attachment(img_data, maintype='image', subtype='jpeg', filename=os.path.basename(image_path))

    # Gửi mail 
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(os.getenv("EMAIL_SENDER"), os.getenv("EMAIL_PASSWORD"))
        smtp.send_message(msg)