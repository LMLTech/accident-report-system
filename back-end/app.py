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

# Hàm kiểm tra đăng nhập
def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            flash('Vui lòng đăng nhập để truy cập trang này.', 'error')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

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
        cccd = request.form['cccd']
        phone = request.form['phone']
        location = request.form['location']
        description = request.form['description']
        
        # Mức độ tai nạn được gửi từ form
        severity = request.form.get('severity', 'Va chạm') 

        image = request.files['image']
        image_filename = secure_filename(image.filename)
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
        if not os.path.exists(app.config['UPLOAD_FOLDER']):
            os.makedirs(app.config['UPLOAD_FOLDER'])
        image.save(image_path)

        report = AccidentReport(
            name=name,
            cccd=cccd,
            phone=phone,
            location=location,
            description=description,
            image_filename=image_filename
        )
        db.session.add(report)
        db.session.commit()

        send_emergency_email(name, location, description, image_path)
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
    return render_template('reports.html')

@app.route('/admin/report/<int:report_id>')
@login_required
def view_report(report_id):
    report = AccidentReport.query.get_or_404(report_id)
    return render_template('report_detail.html', report=report)

@app.route('/admin/report/<int:report_id>/update', methods=['POST'])
@login_required
def update_report_status(report_id):
    report = AccidentReport.query.get_or_404(report_id)
    new_status = request.form.get('status')
    if new_status:
        report.status = new_status
        db.session.commit()
        flash('Cập nhật trạng thái thành công!', 'success')
        return jsonify(success=True)
    else:
        flash('Cập nhật trạng thái thất bại!', 'error')
        return jsonify(success=False), 400

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
    reports_today = AccidentReport.query.filter(AccidentReport.timestamp >= today).all()
    
    total_today = len(reports_today)
    processing_count = len([r for r in reports_today if r.status == 'Đang xử lý'])
    done_count = len([r for r in reports_today if r.status == 'Đã xử lý'])
    
    # Giả định một mức độ trung bình (ví dụ: tất cả đều là 3/5)
    avg_severity = "N/A"
    
    # Dữ liệu cho biểu đồ hoạt động theo giờ
    hourly_activity = {h: 0 for h in range(24)}
    for report in reports_today:
        hour = report.timestamp.hour
        hourly_activity[hour] += 1
    
    hourly_data = [{'hour': f'{h:02d}:00', 'count': count} for h, count in hourly_activity.items()]

    # Dữ liệu cho biểu đồ tỉ lệ trạng thái
    status_ratio = {
        'Đang xử lý': processing_count,
        'Đã xử lý': done_count,
        'Chờ': total_today - processing_count - done_count
    }
    
    # Lấy 5 báo cáo mới nhất
    recent_reports = AccidentReport.query.order_by(AccidentReport.timestamp.desc()).limit(5).all()
    
    # Tạo dữ liệu map
    map_reports = [{
        'id': r.id,
        'location': r.location,
        'status': r.status,
        'lat': 10.77 + (r.id * 0.005) % 0.05,  # Dữ liệu lat/lng giả định
        'lng': 106.70 + (r.id * 0.005) % 0.05
    } for r in recent_reports]

    return jsonify({
        'totalToday': total_today,
        'processing': processing_count,
        'done': done_count,
        'avgSeverity': avg_severity,
        'lastUpdated': datetime.now().strftime('%H:%M'),
        'hourlyActivity': hourly_data,
        'statusRatio': status_ratio,
        'recentReports': [{
            'id': r.id,
            'timestamp': r.timestamp.strftime('%H:%M %d-%m-%Y'),
            'description': r.description,
            'location': r.location,
            'status': r.status
        } for r in recent_reports],
        'mapReports': map_reports
    })

@app.route('/api/admin/reports')
@login_required
def reports_api():
    reports = AccidentReport.query.order_by(AccidentReport.timestamp.desc()).all()
    reports_data = [{
        'id': r.id,
        'timestamp': r.timestamp.strftime('%H:%M %d-%m-%Y'),
        'description': r.description,
        'location': r.location,
        'status': r.status
    } for r in reports]
    return jsonify(reports_data)

@app.route('/api/admin/detailed-stats')
@login_required
def detailed_stats_api():
    all_reports = AccidentReport.query.all()

    # Thống kê theo khu vực
    stats_by_region = defaultdict(lambda: defaultdict(int))
    for report in all_reports:
        # Giả định địa điểm có dạng "Quận X, TPHCM" hoặc "TP Y, Tỉnh Z"
        location_parts = report.location.split(', ')
        if len(location_parts) >= 2:
            sub_region = location_parts[0]  # Ví dụ: "Quận 1", "TP Thủ Đức"
            main_region = location_parts[1] # Ví dụ: "TPHCM", "Tiền Giang"
            stats_by_region[main_region][sub_region] += 1
    
    # Thống kê theo ngày trong tuần (7 ngày gần nhất)
    reports_by_day = defaultdict(int)
    today = datetime.now().date()
    seven_days_ago = today - timedelta(days=6)
    
    date_range = [seven_days_ago + timedelta(days=i) for i in range(7)]
    day_labels = [d.strftime('%A') for d in date_range] # Tên ngày trong tuần
    
    reports_in_range = AccidentReport.query.filter(AccidentReport.timestamp >= seven_days_ago).all()
    for report in reports_in_range:
        day_of_week = report.timestamp.strftime('%A')
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
    
    with app.app_context():
        print("🔨 Đang tạo bảng trong CSDL nếu chưa có...")
        db.create_all()

        if not User.query.filter_by(username='admin').first():
            hashed_password = generate_password_hash('123456', method='pbkdf2:sha256') 
            admin_user = User(username='admin', password=hashed_password)
            db.session.add(admin_user)
            db.session.commit()

    app.run(debug=True)