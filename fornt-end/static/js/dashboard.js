// fornt-end/static/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const sidebarButtons = document.querySelectorAll('.menu button');
    const sections = document.querySelectorAll('.content-section');
    const reportsTableBody = document.getElementById('reportsTable');
    const allReportsTableBody = document.getElementById('allReportsTable');

    let lineChartInstance = null;
    let pieChartInstance = null;
    let mapInstance = null;
    let markers = [];

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
            fetchAndInitMap('full-map');
        } else if (targetSectionId === 'reports-section') {
            fetchAndRenderReports();
        } else if (targetSectionId === 'stats-section') {
            fetchAndRenderStats();
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

    // Thêm sự kiện cho nút "Xem tất cả"
    const viewAllReportsBtn = document.getElementById('view-all-reports');
    if (viewAllReportsBtn) {
        viewAllReportsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const reportsButton = document.querySelector('.menu button[data-section="reports"]');
            if (reportsButton) {
                reportsButton.click();
            }
        });
    }

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
                    <td>
                        <select class="status-select" data-report-id="${r.id}">
                            <option value="Đang xử lý" ${r.status === 'Đang xử lý' ? 'selected' : ''}>Đang xử lý</option>
                            <option value="Đã xử lý" ${r.status === 'Đã xử lý' ? 'selected' : ''}>Đã xử lý</option>
                            <option value="Chưa xác định" ${r.status === 'Chưa xác định' ? 'selected' : ''}>Chưa xác định</option>
                        </select>
                    </td>
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
    
    // Hàm xử lý cập nhật trạng thái báo cáo
    function handleUpdateStatus(reportId, newStatus) {
        const data = {
            status: newStatus
        };

        fetch(`/admin/report/${reportId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Cập nhật thất bại');
            }
            return response.json();
        })
        .then(result => {
            alert('Cập nhật trạng thái thành công!');
            fetchAndRenderReports(); // Tải lại bảng sau khi cập nhật
            fetchAndRenderDashboardStats(); // Tải lại dashboard để cập nhật số liệu
        })
        .catch(error => {
            console.error('Lỗi:', error);
            alert('Có lỗi xảy ra khi cập nhật trạng thái.');
        });
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
                        <td>
                            <select class="status-select" data-report-id="${r.id}">
                                <option value="Đang xử lý" ${r.status === 'Đang xử lý' ? 'selected' : ''}>Đang xử lý</option>
                                <option value="Đã xử lý" ${r.status === 'Đã xử lý' ? 'selected' : ''}>Đã xử lý</option>
                                <option value="Chưa xác định" ${r.status === 'Chưa xác định' ? 'selected' : ''}>Chưa xác định</option>
                            </select>
                        </td>
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
            initPieChart(data.statusCounts);
            
            // Khởi tạo bản đồ preview
            initMap('map-preview', recentReports);

        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu dashboard:', error);
        }
    }

    // Lấy và hiển thị dữ liệu thống kê
    async function fetchAndRenderStats() {
        try {
            const response = await fetch('/api/admin/stats');
            const data = await response.json();
            console.log(data);

        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu thống kê:', error);
        }
    }

    // Khởi tạo biểu đồ Line (hoạt động theo giờ)
    function initLineChart(data) {
        if (lineChartInstance) {
            lineChartInstance.destroy();
        }
        const ctx = document.getElementById('lineChart');
        if (!ctx) return;
        
        lineChartInstance = new Chart(ctx, {
            type:'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label:'Số vụ',
                    tension:0.3,
                    borderColor:'#06b6d4',
                    backgroundColor:'rgba(6,182,212,0.18)',
                    fill:true,
                    data: data.data
                }]
            },
            options:{
                responsive: true,
                maintainAspectRatio: false,
                plugins:{legend:{display:false}},
                scales:{y:{beginAtZero:true}}
            }
        });
    }

    // Khởi tạo biểu đồ Pie
    function initPieChart(data) {
        if (pieChartInstance) {
            pieChartInstance.destroy();
        }
        const ctx = document.getElementById('pieChart');
        if (!ctx) return;
        
        pieChartInstance = new Chart(ctx, {
            type:'doughnut',
            data: {
                labels: data.labels,
                datasets:[{
                    data: data.data,
                    backgroundColor:['#ef4444','#10b981','#f59e0b', '#3b82f6']
                }]
            },
            options:{
                responsive: true,
                maintainAspectRatio: false,
                plugins:{legend:{position:'bottom'}}
            }
        });
    }

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

    // Lắng nghe sự kiện thay đổi trên các dropdown trạng thái
    document.addEventListener('change', (event) => {
        if (event.target.classList.contains('status-select')) {
            const selectElement = event.target;
            const reportId = selectElement.getAttribute('data-report-id');
            const newStatus = selectElement.value;
            
            if (confirm(`Bạn có chắc chắn muốn cập nhật trạng thái của báo cáo #${reportId} thành "${newStatus}"?`)) {
                handleUpdateStatus(reportId, newStatus);
            } else {
                // Nếu người dùng hủy, reset dropdown về trạng thái ban đầu
                // Bằng cách tải lại bảng để đảm bảo đồng bộ
                fetchAndRenderReports(); 
                fetchAndRenderDashboardStats();
            }
        }
    });

    // Khởi động
    fetchAndRenderDashboardStats();
    
});