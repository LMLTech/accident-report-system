# app.py
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from flask_cors import CORS
import os
import functools 
from utils.email_sender import send_emergency_email 
from database.models import db, AccidentReport, User 
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date, timedelta
from collections import defaultdict
import json
import pytz 

# Load biến môi trường từ .env
load_dotenv()

# Cấu hình ứng dụng Flask
app = Flask(__name__,
            template_folder="../fornt-end/templates", 
            static_folder="../fornt-end/static")

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
instance_path = os.path.join(BASE_DIR, 'instance')
db_path = os.path.join(instance_path, 'accidents.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'static', 'uploads')

db.init_app(app)
CORS(app)

# Hàm chuyển đổi thời gian từ UTC sang múi giờ địa phương (Việt Nam)
def convert_to_vietnam_time(utc_dt):
    if utc_dt:
        vietnam_timezone = pytz.timezone('Asia/Ho_Chi_Minh')
        utc_dt = pytz.utc.localize(utc_dt)
        return utc_dt.astimezone(vietnam_timezone)
    return None

# Hàm kiểm tra đăng nhập
def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            flash('Vui lòng đăng nhập để truy cập trang này.', 'error')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# Hàm trợ giúp để xử lý dữ liệu tọa độ
def get_valid_coordinate(coord_str):
    """Kiểm tra và chuyển đổi chuỗi tọa độ thành float hoặc None."""
    if coord_str is not None and isinstance(coord_str, str) and coord_str.lower() != 'null' and coord_str.strip() != '':
        try:
            return float(coord_str)
        except (ValueError, TypeError):
            return None
    return None

# ==== ROUTES CỦA NGƯỜI DÙNG ====

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/report')
def report_form():
    return render_template('report_form.html')

@app.route('/report', methods=['POST'])
def submit_report():
    try:
        name = request.form['name']
        # Nếu từ AI (bắt đầu bằng AI_Detection), cho phép cccd và phone trống
        cccd = request.form.get('cccd', '') if name.startswith('AI_Detection') else request.form['cccd']
        phone = request.form.get('phone', '') if name.startswith('AI_Detection') else request.form['phone']
        location = request.form['location']
        description = request.form['description']
        
        # Mức độ tai nạn được gửi từ form
        severity = request.form.get('severity', 'Va chạm') 
        
        # Lấy tọa độ từ request, nếu không có thì gán None
        lat = request.form.get('lat')
        lng = request.form.get('lng')

        image = request.files.get('image')
        image_filename = None
        image_path = None # Khởi tạo biến image_path

        if image and image.filename != '':
            image_filename = secure_filename(image.filename)
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
            if not os.path.exists(app.config['UPLOAD_FOLDER']):
                os.makedirs(app.config['UPLOAD_FOLDER'])
            image.save(image_path)

        # Nếu từ AI, thêm ghi chú
        if name.startswith('AI_Detection'):
            description += ' (Từ camera AI)'

        report = AccidentReport(
            name=name,
            cccd=cccd,
            phone=phone,
            location=location,
            description=description,
            image_filename=image_filename,
            severity=severity,
            lat=lat, # Thêm lat
            lng=lng  # Thêm lng
        )
        db.session.add(report)
        db.session.commit()

        # Gọi hàm gửi email, truyền image_path vào.
        # Hàm này đã được sửa lỗi để xử lý trường hợp image_path là None
        send_emergency_email(name, location, description, image_path)
        
        # Trả về trang success.html như ban đầu
        return render_template("success.html")

    except Exception as e:
        print(f"Lỗi khi gửi báo cáo: {e}")
        flash('Đã xảy ra lỗi, vui lòng thử lại.', 'error')
        return redirect(url_for('report_form'))

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    # Trả về file từ thư mục static/uploads
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ==== ROUTES CỦA ADMIN ====

@app.route('/admin', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            session['logged_in'] = True
            session['username'] = user.username
            flash('Đăng nhập thành công!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Tên đăng nhập hoặc mật khẩu không đúng!', 'error')
            return render_template('login_admin.html', error='Tên đăng nhập hoặc mật khẩu không đúng!')
    return render_template('login_admin.html')

@app.route('/admin/dashboard')
@login_required
def admin_dashboard():
    return render_template('dashboard.html')

@app.route('/admin/stats')
@login_required
def stats_page():
    return render_template('stats.html')

@app.route('/admin/reports')
@login_required
def reports_page():
    return render_template('reports_form.html')

# Trong app.py, thêm hoặc sửa route này
@app.route('/admin/report/<int:report_id>')
@login_required
def report_detail(report_id):
    report = AccidentReport.query.get_or_404(report_id)
    
    # Chuyển đổi thời gian sang múi giờ Việt Nam
    vietnam_timestamp = convert_to_vietnam_time(report.timestamp) if report.timestamp else None
    
    # Parse tọa độ từ location nếu có định dạng "lat, lng"
    lat = None
    lng = None
    location_display = report.location or 'Không có tọa độ'
    if report.location and ',' in report.location:
        try:
            coords = report.location.split(',')
            lat = float(coords[0].strip())
            lng = float(coords[1].strip())
            location_display = 'Vị trí từ tọa độ'  # Text tùy chỉnh khi parse thành công
        except (ValueError, IndexError):
            pass  # Nếu parse lỗi, giữ nguyên location
    
    # Nếu lat/lng có trong DB (nếu đã lưu), ưu tiên dùng chúng
    if report.lat and report.lng:
        lat = report.lat
        lng = report.lng
        location_display = report.location or 'Không rõ vị trí'
    
    return render_template('report_detail.html', 
                           report=report, 
                           vietnam_timestamp=vietnam_timestamp,  # Thời gian đã convert
                           lat=lat, 
                           lng=lng, 
                           location_display=location_display)  # Chuỗi hiển thị

@app.route('/admin/report/<int:report_id>/update', methods=['POST'])
@login_required
def update_report_status(report_id):
    report = AccidentReport.query.get_or_404(report_id)
    data = request.json
    new_status = data.get('status')
    
    if new_status:
        report.status = new_status
        db.session.commit()
        return jsonify(success=True, message="Cập nhật trạng thái thành công!")
    else:
        return jsonify(success=False, message="Cập nhật trạng thái thất bại!"), 400

@app.route('/admin/logout')
@login_required
def admin_logout():
    session.pop('logged_in', None)
    session.pop('username', None)
    flash('Đã đăng xuất!', 'success')
    return redirect(url_for('admin_login'))

# ==== API ENDPOINTS CHO DASHBOARD (ĐỂ LẤY DỮ LIỆU BẰNG AJAX) ====

@app.route('/api/admin/dashboard-stats')
@login_required
def dashboard_stats_api():
    today = date.today()
    all_reports = AccidentReport.query.all()

    # Lọc báo cáo của ngày hôm nay theo múi giờ địa phương
    today_reports = [r for r in all_reports if convert_to_vietnam_time(r.timestamp).date() == today]
    
    total_today = len(today_reports)
    processing_count = len([r for r in today_reports if r.status == 'Đang xử lý'])
    done_count = len([r for r in today_reports if r.status == 'Đã xử lý'])
    
    # Tính mức độ trung bình (ví dụ: gán giá trị số cho mức độ)
    severity_map = {'Nhẹ': 1, 'Trung bình': 3, 'Nghiêm trọng': 5}
    total_severity = sum(severity_map.get(r.severity, 0) for r in all_reports)
    avg_severity = round(total_severity / len(all_reports), 2) if all_reports else 0
    
    # Thống kê hoạt động theo giờ
    hourly_activity = defaultdict(int)
    for i in range(24):
        hourly_activity[i] = 0
    
    for r in all_reports:
        # Lấy giờ theo múi giờ địa phương
        hour = convert_to_vietnam_time(r.timestamp).hour
        hourly_activity[hour] += 1
    
    # Lấy 5 báo cáo mới nhất
    recent_reports = AccidentReport.query.order_by(AccidentReport.timestamp.desc()).limit(5).all()
    recent_reports_data = [
        {
            'id': r.id,
            'timestamp': convert_to_vietnam_time(r.timestamp).strftime('%H:%M %d-%m-%Y'), # Chuyển đổi ở đây
            'location': r.location,
            'description': r.description,
            'status': r.status,
            'lat': get_valid_coordinate(r.lat),
            'lng': get_valid_coordinate(r.lng)
        } for r in recent_reports
    ]

    # Thống kê theo trạng thái cho biểu đồ tròn
    status_counts = defaultdict(int)
    for r in all_reports:
        status_counts[r.status] += 1
    
    return jsonify({
        'totalToday': total_today,
        'processing': processing_count,
        'done': done_count,
        'avgSeverity': avg_severity,
        'lastUpdated': datetime.now().strftime('%H:%M'),
        'hourlyActivity': {
            'labels': [f'{h:02d}:00' for h in range(24)],
            'data': [hourly_activity[h] for h in range(24)]
        },
        'statusCounts': {
            'labels': list(status_counts.keys()),
            'data': list(status_counts.values())
        },
        'recentReports': recent_reports_data
    })

@app.route('/api/admin/reports')
@login_required
def get_all_reports_api():
    reports = AccidentReport.query.order_by(AccidentReport.timestamp.desc()).all()
    reports_data = [
        {
            'id': r.id,
            'timestamp': convert_to_vietnam_time(r.timestamp).strftime('%H:%M %d-%m-%Y'),
            'location': r.location,
            'description': r.description,
            'status': r.status,
            'lat': get_valid_coordinate(r.lat),
            'lng': get_valid_coordinate(r.lng)
        } for r in reports
    ]
    return jsonify(reports_data)

@app.route('/api/admin/map-reports')
@login_required
def get_map_reports_api():
    reports = AccidentReport.query.all()
    reports_data = [
        {
            'id': r.id,
            'location': r.location,
            'status': r.status,
            'lat': get_valid_coordinate(r.lat),
            'lng': get_valid_coordinate(r.lng)
        } for r in reports if get_valid_coordinate(r.lat) is not None and get_valid_coordinate(r.lng) is not None
    ]
    return jsonify(reports_data)

@app.route('/api/admin/stats')
@login_required
def stats_api():
    all_reports = AccidentReport.query.all()
    
    # Thống kê theo khu vực
    stats_by_region = defaultdict(int)
    for report in all_reports:
        stats_by_region[report.location] += 1
    
    # Thống kê theo ngày trong tuần (7 ngày gần nhất)
    today = date.today()
    reports_by_day = defaultdict(int)
    seven_days_ago = today - timedelta(days=6)
    
    date_range = [seven_days_ago + timedelta(days=i) for i in range(7)]
    day_labels = [d.strftime('%a') for d in date_range] # Tên ngày trong tuần (ví dụ: Mon, Tue)
    
    reports_in_range = AccidentReport.query.filter(AccidentReport.timestamp >= seven_days_ago).all()
    for report in reports_in_range:
        # Chuyển đổi thời gian của báo cáo sang múi giờ địa phương trước khi lấy ngày
        vietnam_time = convert_to_vietnam_time(report.timestamp)
        day_of_week = vietnam_time.strftime('%a')
        reports_by_day[day_of_week] += 1
        
    reports_by_day_data = [reports_by_day.get(d, 0) for d in day_labels]

    # Thống kê theo mức độ
    severity_counts = defaultdict(int)
    for report in all_reports:
        severity_counts[report.severity] += 1
    
    return jsonify({
        'statsByRegion': stats_by_region,
        'reportsByDay': {
            'labels': day_labels,
            'data': reports_by_day_data
        },
        'severityCounts': severity_counts
    })


# ==== CHẠY CHƯƠNG TRÌNH ====

if __name__ == '__main__':
    if not os.path.exists(instance_path):
        os.makedirs(instance_path)
    
    # Tạo thư mục uploads nếu chưa tồn tại
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    with app.app_context():
        print("🔨 Đang tạo cơ sở dữ liệu...")
        db.create_all()
        # Tạo người dùng admin mặc định nếu chưa tồn tại
        if not User.query.filter_by(username='admin').first():
            hashed_password = generate_password_hash('admin123')
            admin_user = User(username='admin', password=hashed_password)
            db.session.add(admin_user)
            db.session.commit()
            print("✅ Đã tạo người dùng 'admin' với mật khẩu 'admin123'")
        
        print("🚀 Khởi động server...")
    
    app.run(debug=True, port=8000)