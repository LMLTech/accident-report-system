// fornt-end/static/js/report_detail.js
document.addEventListener('DOMContentLoaded', () => {
    const statusUpdateForm = document.getElementById('statusUpdateForm');
    const updateStatusBtn = document.getElementById('updateStatusBtn');
    const statusSelect = document.getElementById('status-select');
    const statusMessage = document.getElementById('statusMessage');
    const reportStatusBadge = document.getElementById('reportStatusBadge');
    const backButton = document.getElementById('backButton');

    // Handle form submission to update report status via API
    statusUpdateForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Show loading state
        updateStatusBtn.disabled = true;
        updateStatusBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang cập nhật...';

        const reportId = e.target.report_id.value;
        const newStatus = statusSelect.value;
        
        try {
            const response = await fetch(`/admin/report/${reportId}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `status=${encodeURIComponent(newStatus)}`
            });
            
            if (response.ok) {
                // Handle success message
                statusMessage.textContent = 'Cập nhật trạng thái thành công!';
                statusMessage.classList.remove('error');
                statusMessage.classList.add('success');
                statusMessage.style.display = 'block';

                // Update the status badge on the page
                reportStatusBadge.textContent = newStatus;
                reportStatusBadge.className = 'badge';
                if (newStatus === 'Đang xử lý') {
                    reportStatusBadge.style.background = '#fee2e2';
                    reportStatusBadge.style.color = '#ef4444';
                } else if (newStatus === 'Đã xử lý') {
                    reportStatusBadge.style.background = '#d1fae5';
                    reportStatusBadge.style.color = '#065f46';
                } else {
                    reportStatusBadge.style.background = '#f3f4f6';
                    reportStatusBadge.style.color = '#6b7280';
                }
            } else {
                // Handle error message
                statusMessage.textContent = 'Đã xảy ra lỗi khi cập nhật trạng thái.';
                statusMessage.classList.remove('success');
                statusMessage.classList.add('error');
                statusMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error updating status:', error);
            statusMessage.textContent = 'Lỗi kết nối server.';
            statusMessage.classList.remove('success');
            statusMessage.classList.add('error');
            statusMessage.style.display = 'block';
        } finally {
            // Re-enable button and reset text
            updateStatusBtn.disabled = false;
            updateStatusBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Cập nhật';
        }
    });

    // Handle back button click
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.history.back();
        });
    }

    // Hide status message after a few seconds
    statusMessage.addEventListener('click', () => {
        statusMessage.style.display = 'none';
    });
    
});
