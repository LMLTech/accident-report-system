// fornt-end/static/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const sidebarButtons = document.querySelectorAll('.menu button');
    const sections = document.querySelectorAll('.content-section');
    const reportsTableBody = document.getElementById('reportsTable');
    const allReportsTableBody = document.getElementById('allReportsTable');

    // Chuyển đổi giữa các sections
    function switchSection(targetSectionId) {
        sections.forEach(section => {
            if (section.id === targetSectionId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        // Xử lý logic đặc biệt cho từng section
        if (targetSectionId === 'map-section') {
            initMap('full-map');
        } else if (targetSectionId === 'reports-section') {
            fetchAndRenderReports();
        }
    }

    // Xử lý sự kiện click trên sidebar
    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => {
            sidebarButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const targetSection = button.getAttribute('data-section');
            
            // Xử lý các section khác nhau
            if (targetSection === 'dashboard') {
                switchSection('dashboard-section');
            } else if (targetSection === 'reports') {
                switchSection('reports-section');
            } else if (targetSection === 'stats') {
                switchSection('stats-section');
            } else if (targetSection === 'map') {
                switchSection('map-section');
            } else if (targetSection === 'users') {
                switchSection('users-section');
            } else if (targetSection === 'notif') {
                switchSection('notif-section');
            }
        });
    });

    // Hàm render status badge
    function renderStatusBadge(status) {
        let badgeClass = 'bg-gray-100 text-gray-800';
        if (status === 'Đang xử lý') {
            badgeClass = 'bg-yellow-100 text-yellow-800';
        } else if (status === 'Đã xử lý') {
            badgeClass = 'bg-green-100 text-green-800';
        }
        return `<span class="badge ${badgeClass}">${status}</span>`;
    }

    // Hàm lấy và hiển thị dữ liệu báo cáo
    async function fetchAndRenderReports() {
        try {
            const response = await fetch('/api/admin/reports');
            const reports = await response.json();
            
            allReportsTableBody.innerHTML = '';
            reports.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.id}</td>
                    <td>${r.timestamp}</td>
                    <td>${r.description}</td>
                    <td>${r.location}</td>
                    <td>${renderStatusBadge(r.status)}</td>
                    <td>
                        <a href="/admin/report/${r.id}" class="viewBtn" style="background:transparent;border:0;color:var(--purple-500);cursor:pointer">
                            Chi tiết
                        </a>
                    </td>
                `;
                allReportsTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu báo cáo:', error);
        }
    }

    // Hàm lấy và hiển thị dữ liệu tổng quan
    async function fetchAndRenderDashboardStats() {
        try {
            const response = await fetch('/api/admin/dashboard-stats');
            const data = await response.json();
            
            document.getElementById('statTotal').textContent = data.totalToday;
            document.getElementById('statProcessing').textContent = data.processing;
            document.getElementById('statDone').textContent = data.done;
            document.getElementById('statSeverity').textContent = data.avgSeverity + ' / 5';
            document.getElementById('todayCount').textContent = data.totalToday;
            document.getElementById('statTime').textContent = data.lastUpdated;
            
            // Render 5 báo cáo mới nhất
            const recentReports = data.recentReports;
            if (reportsTableBody) {
                reportsTableBody.innerHTML = '';
                recentReports.forEach(r => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${r.id}</td>
                        <td>${r.timestamp}</td>
                        <td>${r.description}</td>
                        <td>${r.location}</td>
                        <td>${renderStatusBadge(r.status)}</td>
                        <td>
                            <a href="/admin/report/${r.id}" class="viewBtn" style="background:transparent;border:0;color:var(--purple-500);cursor:pointer">
                                Chi tiết
                            </a>
                        </td>
                    `;
                    reportsTableBody.appendChild(tr);
                });
            }
            
            // Vẽ biểu đồ
            initLineChart(data.hourlyActivity);
            initPieChart(data.statusRatio);
            
            // Thêm marker vào bản đồ tổng quan
            initMap('map', data.mapReports);
            
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu Dashboard:', error);
        }
    }
    
    // Khởi tạo biểu đồ Line (hoạt động theo giờ)
    let lineChartInstance;
    function initLineChart(data) {
        if (lineChartInstance) {
            lineChartInstance.destroy();
        }
        const ctx = document.getElementById('lineChart').getContext('2d');
        const labels = data.map(d => d.hour);
        const reportCounts = data.map(d => d.count);
        
        lineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Số vụ',
                    tension: 0.3,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6,182,212,0.18)',
                    fill: true,
                    data: reportCounts
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // Khởi tạo biểu đồ Pie
    let pieChartInstance;
    function initPieChart(data) {
        if (pieChartInstance) {
            pieChartInstance.destroy();
        }
        const ctx = document.getElementById('pieChart').getContext('2d');
        const labels = Object.keys(data);
        const values = Object.values(data);
        const colors = ['#ef4444', '#10b981', '#f59e0b']; // Đang xử lý, Đã xử lý, Chờ
        
        pieChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors
                }]
            },
            options: { plugins: { legend: { position: 'bottom' } } }
        });
    }

    let mapInstance;
    let markers = [];
    // Khởi tạo bản đồ (Leaflet)
    function initMap(mapId, reports = []) {
        if (mapInstance) {
            mapInstance.remove();
            mapInstance = null;
        }

        const mapElement = document.getElementById(mapId);
        if (!mapElement) {
            return;
        }

        mapInstance = L.map(mapId).setView([10.78, 106.70], 12); // Vị trí trung tâm TP.HCM
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(mapInstance);

        markers.forEach(marker => mapInstance.removeLayer(marker));
        markers = [];
        
        // Thêm marker từ reports
        reports.forEach(r => {
            const marker = L.marker([r.lat, r.lng]).addTo(mapInstance)
                .bindPopup(`<strong>Báo cáo ${r.id}</strong><br>${r.location}<br><em>${r.status}</em>`);
            markers.push(marker);
        });
    }

    // Khởi động
    fetchAndRenderDashboardStats();
    
    // Gợi ý: Thay thế nút "Xem tất cả" bằng button có data-section
    const viewAllButton = document.querySelector('.card button');
    if (viewAllButton) {
        viewAllButton.addEventListener('click', () => {
            switchSection('reports-section');
            sidebarButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelector('[data-section="reports"]').classList.add('active');
        });
    }
});
