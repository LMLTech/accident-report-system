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

        if (targetSectionId === 'map-section') {
            fetchAndInitMap('full-map');
        } else if (targetSectionId === 'reports-section') {
            fetchAndRenderReports();
        } else if (targetSectionId === 'stats-section') {
            fetchAndRenderStats();
        } else if (targetSectionId === 'dashboard-section') {
            fetchAndRenderDashboardStats();
        }
    }

    // Xử lý sự kiện click trên sidebar
    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => {
            sidebarButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const targetSection = button.getAttribute('data-section');
            
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

    // Hàm lấy và hiển thị dữ liệu báo cáo - CÓ DEBUG
    async function fetchAndRenderReports() {
        try {
            const response = await fetch('/api/admin/reports');
            const reports = await response.json();
            
            // DEBUG: Xem dữ liệu trả về
            console.log('Reports data:', reports);
            
            allReportsTableBody.innerHTML = '';
            reports.forEach(r => {
                // DEBUG: Xem từng report
                console.log('Report:', r);
                console.log('Lat:', r.lat, 'Lng:', r.lng);
                console.log('Has coordinates:', !!(r.lat && r.lng));
                
                let areaHtml;
                if (r.lat !== null && r.lng !== null) {
                    areaHtml = `
                        <div>
                          <div style="font-weight:500;margin-bottom:2px;">${r.location || 'Không rõ vị trí'}</div>
                          <a href="https://maps.google.com/maps?q=${r.lat},${r.lng}" target="_blank" 
                             style="color:var(--purple-500);text-decoration:underline;cursor:pointer;font-size:12px;"
                             title="Xem vị trí trên Google Maps">
                             📍 ${r.lat}, ${r.lng}
                          </a>
                        </div>`;
                } else if (r.location && r.location.includes(',')) {
                    const [lat, lng] = r.location.split(',').map(s => s.trim());
                    if (!isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
                        areaHtml = `
                            <div>
                              <div style="font-weight:500;margin-bottom:2px;">vị trí tai nạn</div>
                              <a href="https://maps.google.com/maps?q=${lat},${lng}" target="_blank" 
                                 style="color:var(--purple-500);text-decoration:underline;cursor:pointer;font-size:12px;"
                                 title="Xem vị trí trên Google Maps">
                                 📍 ${lat}, ${lng}
                              </a>
                            </div>`;
                    } else {
                        areaHtml = `<span>${r.location || 'Không có tọa độ'}</span>`;
                    }
                } else {
                    areaHtml = `<span>${r.location || 'Không có tọa độ'}</span>`;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.id}</td>
                    <td>${r.timestamp}</td>
                    <td>${r.description}</td>
                    <td>${areaHtml}</td>
                    <td>
                        <select class="status-select" data-report-id="${r.id}">
                            <option value="Đang xử lý" ${r.status === 'Đang xử lý' ? 'selected' : ''}>Đang xử lý</option>
                            <option value="Đã xử lý" ${r.status === 'Đã xử lý' ? 'selected' : ''}>Đã xử lý</option>
                            <option value="Chưa xác định" ${r.status === 'Chưa xác định' ? 'selected' : ''}>Chưa xác định</option>
                        </select>
                    </td>
                    <td>
                        <button class="viewBtn js-view-report-btn" data-report-id="${r.id}" style="background:transparent;border:0;color:var(--purple-500);cursor:pointer">
                            Chi tiết
                        </button>
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
        const data = { status: newStatus };

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
            fetchAndRenderReports();
            fetchAndRenderDashboardStats();
        })
        .catch(error => {
            console.error('Lỗi:', error);
            alert('Có lỗi xảy ra khi cập nhật trạng thái.');
        });
    }

    // Hàm lấy và hiển thị dữ liệu tổng quan - CÓ DEBUG
    async function fetchAndRenderDashboardStats() {
        try {
            const response = await fetch('/api/admin/dashboard-stats');
            const data = await response.json();
            
            // DEBUG: Xem dữ liệu dashboard
            console.log('Dashboard data:', data);
            console.log('Recent reports:', data.recentReports);
            
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
                    // DEBUG: Xem từng recent report
                    console.log('Recent report:', r);
                    console.log('Recent Lat:', r.lat, 'Lng:', r.lng);
                    
                    let areaHtml;
                    if (r.lat !== null && r.lng !== null) {
                        areaHtml = `
                            <div>
                              <div style="font-weight:500;margin-bottom:2px;">${r.location || 'Không rõ vị trí'}</div>
                              <a href="https://maps.google.com/maps?q=${r.lat},${r.lng}" target="_blank" 
                                 style="color:var(--purple-500);text-decoration:underline;cursor:pointer;font-size:12px;"
                                 title="Xem vị trí trên Google Maps">
                                 📍 ${r.lat}, ${r.lng}
                              </a>
                            </div>`;
                    } else if (r.location && r.location.includes(',')) {
                        const [lat, lng] = r.location.split(',').map(s => s.trim());
                        if (!isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
                            areaHtml = `
                                <div>
                                  <div style="font-weight:500;margin-bottom:2px;">vị trí tai nạn</div>
                                  <a href="https://maps.google.com/maps?q=${lat},${lng}" target="_blank" 
                                     style="color:var(--purple-500);text-decoration:underline;cursor:pointer;font-size:12px;"
                                     title="Xem vị trí trên Google Maps">
                                     📍 ${lat}, ${lng}
                                  </a>
                                </div>`;
                        } else {
                            areaHtml = `<span>${r.location || 'Không có tọa độ'}</span>`;
                        }
                    } else {
                        areaHtml = `<span>${r.location || 'Không có tọa độ'}</span>`;
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${r.id}</td>
                        <td>${r.timestamp}</td>
                        <td>${r.description}</td>
                        <td>${areaHtml}</td>
                        <td>
                            <select class="status-select" data-report-id="${r.id}">
                                <option value="Đang xử lý" ${r.status === 'Đang xử lý' ? 'selected' : ''}>Đang xử lý</option>
                                <option value="Đã xử lý" ${r.status === 'Đã xử lý' ? 'selected' : ''}>Đã xử lý</option>
                                <option value="Chưa xác định" ${r.status === 'Chưa xác định' ? 'selected' : ''}>Chưa xác định</option>
                            </select>
                        </td>
                        <td>
                            <button class="viewBtn js-view-report-btn" data-report-id="${r.id}" style="background:transparent;border:0;color:var(--purple-500);cursor:pointer">
                                Chi tiết
                            </button>
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

    async function fetchAndRenderStats() {
        try {
            const response = await fetch('/api/admin/stats');
            const data = await response.json();
            console.log(data);

        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu thống kê:', error);
        }
    }
    
    async function fetchAndInitMap(mapId) {
        try {
            const response = await fetch('/api/admin/map-reports');
            const reports = await response.json();
            initMap(mapId, reports);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu bản đồ:', error);
        }
    }

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
                    label:'Sự vụ',
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

    function initMap(mapId, reports = []) {
        if (mapInstance) {
            mapInstance.remove();
            mapInstance = null;
        }

        const mapElement = document.getElementById(mapId);
        if (!mapElement) {
            return;
        }

        mapInstance = L.map(mapId).setView([10.78, 106.70], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(mapInstance);

        markers.forEach(marker => mapInstance.removeLayer(marker));
        markers = [];
        
        reports.forEach(r => {
            if (r.lat && r.lng) { 
                const marker = L.marker([r.lat, r.lng]).addTo(mapInstance)
                    .bindPopup(`<strong>Báo cáo ${r.id}</strong><br>${r.location}<br><em>${r.status}</em>`);
                markers.push(marker);
            }
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
                fetchAndRenderReports(); 
                fetchAndRenderDashboardStats();
            }
        }
    });

    // Lắng nghe sự kiện click trên các nút "Chi tiết" mới
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('js-view-report-btn')) {
            const reportId = event.target.getAttribute('data-report-id');
            console.log(`Đã bấm vào Chi tiết cho báo cáo ID: ${reportId}`);
            window.location.href = `/admin/report/${reportId}`;
        }
    });

    // Khởi động
    fetchAndRenderDashboardStats();
});