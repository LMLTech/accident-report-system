# database/models.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# Class cho bảng Báo cáo tai nạn
class AccidentReport(db.Model):
    __tablename__ = 'accident_report'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    cccd = db.Column(db.String(12), nullable=False)
    phone = db.Column(db.String(20))
    image_filename = db.Column(db.String(255), nullable=False)
    location = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default="Đang xử lý")
    severity = db.Column(db.String(50)) # Thêm cột này
    lat = db.Column(db.Float) # Thêm cột này
    lng = db.Column(db.Float) # Thêm cột này

# Class mới cho bảng Admin Users
class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'