# database/models.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Chỉ định nghĩa đối tượng SQLAlchemy, chưa khởi tạo với app
# Việc này giúp chúng ta có thể sử dụng db ở nhiều file khác nhau.
db = SQLAlchemy()

# Class cho bảng Báo cáo tai nạn
class AccidentReport(db.Model): 
    __tablename__ = 'accident_report' # Tên bảng trong CSDL

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    cccd = db.Column(db.String(12), nullable=False)
    phone = db.Column(db.String(20))
    image_filename = db.Column(db.String(255), nullable=False)
    location = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default="Đang xử lý")    
  
# Class mới cho bảng Admin Users
class User(db.Model):
    __tablename__ = 'user' # Tên bảng trong CSDL

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'