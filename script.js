// ==========================================
// CẤU HÌNH HỆ THỐNG
// ==========================================
// Đảm bảo link này CÙNG LÀ MỘT LINK với Web Sinh Viên (Apps Script V3.0)
const scriptURL = 'https://script.google.com/macros/s/AKfycbzyP5uGhs3iLrFUDWw12SCnogsizy18HBFmdlVh47n-fbQHHk5yxqpAfTD5DY8llPxj/exec'; 

let currentDataList = []; // Biến lưu trữ dữ liệu tạm để xuất file Excel

// Khởi chạy ngay khi Giảng viên mở web
window.onload = () => {
    loadClasses();
};

// ==========================================
// 1. TẢI DANH SÁCH LỚP HỌC (CHUẨN JSON)
// ==========================================
async function loadClasses() {
    const select = document.getElementById('class-select');
    select.innerHTML = '<option value="">⏳ Đang tải danh sách lớp...</option>';
    
    try {
        const res = await fetch(`${scriptURL}?action=getClasses`);
        const data = await res.json();
        
        if (data.success && data.classes.length > 0) {
            select.innerHTML = '<option value="">-- Chọn lớp học phần --</option>';
            data.classes.forEach(cls => {
                select.innerHTML += `<option value="${cls}">📚 Lớp: ${cls}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Không có lớp nào trên hệ thống</option>';
        }
    } catch (e) {
        select.innerHTML = '<option value="">❌ Lỗi kết nối máy chủ</option>';
        console.error(e);
    }
}

// ==========================================
// 2. TẢI DANH SÁCH NGÀY ĐIỂM DANH (CHUẨN JSON)
// ==========================================
async function loadDates() {
    const classId = document.getElementById('class-select').value;
    const dateSelect = document.getElementById('date-select');
    
    // Nếu chưa chọn lớp thì xóa trắng ô chọn ngày
    if (!classId) {
        dateSelect.innerHTML = '<option value="">-- Chọn ngày --</option>';
        return;
    }

    dateSelect.innerHTML = '<option value="">⏳ Đang tải ngày...</option>';
    try {
        const res = await fetch(`${scriptURL}?action=getDates&classId=${encodeURIComponent(classId)}`);
        const data = await res.json();

        if (data.success && data.dates.length > 0) {
            dateSelect.innerHTML = '<option value="">-- Chọn ngày --</option>';
            // Đảo ngược mảng để ngày mới nhất (hôm nay) đẩy lên trên cùng
            data.dates.reverse().forEach(date => {
                dateSelect.innerHTML += `<option value="${date}">Ngày ${date}</option>`;
            });
        } else {
            dateSelect.innerHTML = '<option value="">Chưa có dữ liệu điểm danh</option>';
        }
    } catch (e) { 
        dateSelect.innerHTML = '<option value="">❌ Lỗi tải ngày</option>'; 
        console.error(e);
    }
}

// ==========================================
// 3. XEM THỐNG KÊ SINH VIÊN (CHUẨN JSON)
// ==========================================
async function loadStats() {
    const classId = document.getElementById('class-select').value;
    const dateStr = document.getElementById('date-select').value;
    const tableBody = document.getElementById('table-body'); 
    const totalElement = document.getElementById('total-count');

    if (!classId || !dateStr) {
        alert("⚠️ Vui lòng chọn đầy đủ Lớp và Ngày!");
        return;
    }

    tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">⏳ Đang tải dữ liệu từ Google Sheets...</td></tr>';
    if (totalElement) totalElement.innerText = "Đang tính...";
    
    try {
        const res = await fetch(`${scriptURL}?action=getStats&classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(dateStr)}`);
        const data = await res.json();

        currentDataList = data.list; // Lưu vào biến toàn cục để chút nữa xuất Excel
        
        if (totalElement) totalElement.innerText = `Tổng số: ${data.total} sinh viên`;

        if (data.total > 0) {
            tableBody.innerHTML = '';
            data.list.forEach((student, index) => {
                tableBody.innerHTML += `
                    <tr>
                        <td style="text-align: center; font-weight: bold;">${student.mssv}</td>
                        <td>${student.name}</td>
                        <td style="text-align: center;">${student.time}</td>
                    </tr>
                `;
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Không có sinh viên nào điểm danh trong ngày này.</td></tr>';
        }
    } catch (e) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">❌ Lỗi mạng: Không thể kết nối đến máy chủ.</td></tr>';
        console.error(e);
    }
}

// ==========================================
// 4. XUẤT FILE EXCEL XỊN (.xlsx) BẰNG THƯ VIỆN SHEETJS
// ==========================================
function exportToExcel() {
    if (currentDataList.length === 0) {
        alert("⚠️ Chưa có dữ liệu! Vui lòng chọn Lớp, chọn Ngày và bấm 'Xem thống kê' trước khi xuất file.");
        return;
    }

    const classId = document.getElementById('class-select').value || "Chung";
    const dateStrFilter = document.getElementById('date-select').value.replace("Ngày ", "").replace(/\//g, '-') || "All";

    // 1. Khởi tạo mảng và thêm hàng Tiêu đề
    const dataForExcel = [
        ["MÃ SỐ SINH VIÊN", "HỌ VÀ TÊN", "THỜI GIAN ĐIỂM DANH"] 
    ];

    // 2. Đẩy dữ liệu sinh viên vào mảng
    currentDataList.forEach(item => {
        dataForExcel.push([item.mssv, item.name, item.time]);
    });

    // 3. Khởi tạo Workbook của Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataForExcel);

    // 4. Cấu hình độ rộng cột cho chuyên nghiệp
    const wscols = [
        {wch: 20}, // Cột MSSV rộng 20
        {wch: 35}, // Cột Tên rộng 35
        {wch: 25}  // Cột Thời gian rộng 25
    ];
    ws['!cols'] = wscols;

    // 5. Đóng gói và tải xuống
    XLSX.utils.book_append_sheet(wb, ws, "Danh Sách Điểm Danh");
    const fileName = `DiemDanh_${classId}_${dateStrFilter}.xlsx`;
    XLSX.writeFile(wb, fileName);
}
