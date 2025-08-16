// fornt-end/static/js/stats.js

document.addEventListener('DOMContentLoaded', () => {
    
    // Hàm gọi API và render dữ liệu
    async function fetchAndRenderStats() {
        try {
            const response = await fetch('/api/admin/detailed-stats');
            const data = await response.json();
            
            renderRegionTable(data.statsByRegion);
            renderBarChart(data.reportsByDay);
            renderPieChart(data.severityCounts);
            
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu thống kê:', error);
            const tableBody = document.getElementById('regionStatsTableBody');
            tableBody.innerHTML = '<tr><td colspan="2">Không thể tải dữ liệu thống kê.</td></tr>';
        }
    }

    // Hàm render bảng thống kê theo khu vực
    function renderRegionTable(statsByRegion) {
        const tableBody = document.getElementById('regionStatsTableBody');
        tableBody.innerHTML = '';
        
        for (const mainRegion in statsByRegion) {
            const totalForRegion = Object.values(statsByRegion[mainRegion]).reduce((sum, count) => sum + count, 0);
            
            const mainRow = document.createElement('tr');
            mainRow.innerHTML = `
                <td><strong>${mainRegion}</strong></td>
                <td><strong>${totalForRegion} vụ</strong></td>
            `;
            tableBody.appendChild(mainRow);
            
            for (const subRegion in statsByRegion[mainRegion]) {
                const subRow = document.createElement('tr');
                subRow.innerHTML = `
                    <td style="padding-left: 30px;">- ${subRegion}</td>
                    <td>${statsByRegion[mainRegion][subRegion]} vụ</td>
                `;
                tableBody.appendChild(subRow);
            }
        }
    }

    // Hàm render biểu đồ Bar Chart (Số vụ theo ngày)
    let barChartInstance;
    function renderBarChart(data) {
        if (barChartInstance) {
            barChartInstance.destroy();
        }
        const ctx = document.getElementById('reportsByDayChart').getContext('2d');
        barChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Số vụ',
                    data: data.data,
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(201, 203, 207, 0.6)',
                        'rgba(255, 205, 86, 0.6)'
                    ],
                    borderColor: [
                        'rgb(54, 162, 235)',
                        'rgb(75, 192, 192)',
                        'rgb(153, 102, 255)',
                        'rgb(255, 159, 64)',
                        'rgb(255, 99, 132)',
                        'rgb(201, 203, 207)',
                        'rgb(255, 205, 86)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Số vụ theo ngày trong tuần' }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Hàm render biểu đồ Pie Chart (Phân loại theo mức độ)
    let pieChartInstance;
    function renderPieChart(data) {
        if (pieChartInstance) {
            pieChartInstance.destroy();
        }
        const ctx = document.getElementById('severityRatioChart').getContext('2d');
        const labels = Object.keys(data);
        const values = Object.values(data);
        
        pieChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#ef4444', // Red
                        '#f59e0b', // Yellow
                        '#10b981', // Green
                        '#3b82f6'  // Blue
                    ],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' },
                    title: { display: true, text: 'Phân loại theo mức độ' }
                }
            }
        });
    }
    
    // Chạy hàm chính khi trang tải
    fetchAndRenderStats();
});