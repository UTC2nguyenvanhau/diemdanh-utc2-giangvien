// ==========================================
// CẤU HÌNH HỆ THỐNG
// ==========================================
const scriptURL = 'https://script.google.com/macros/s/AKfycbyPuE-brwR5j_9YUf8YEObSzMzfUAhUxvqvXAZppw7MJoz-zlmMUJXOvc_ywnHXsH2s/exec'; 
let currentDataList = []; 

// ==========================================
// CÔNG CỤ: TỰ ĐỘNG THỬ LẠI KHI MẠNG YẾU (AUTO-RETRY)
// ==========================================
async function fetchWithRetry(url, retries = 3, timeoutMs = 7000) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            if (!response.ok) throw new Error("Lỗi HTTP");
            return await response.json(); 
        } catch (err) {
            if (i === retries - 1) throw err; 
            await new Promise(r => setTimeout(r, 1500)); // Đợi 1.5s rồi thử lại
        }
    }
}

// ==========================================
// 1. QUẢN LÝ GIAO DIỆN (DARK MODE)
// ==========================================
async function forceSyncData() {
    if(!confirm("Bạn vừa sửa dữ liệu trực tiếp trên Sheet? Hãy bấm OK để hệ thống cập nhật mật khẩu mới.")) return;
    
    try {
        const res = await fetch(`${scriptURL}?action=clearCache`);
        const data = await res.json();
        if(data.success) {
            alert("✅ " + data.message);
            window.location.reload();
        }
    } catch (e) {
        alert("❌ Lỗi kết nối máy chủ!");
    }
}
function toggleTheme(checkbox) {
    if(checkbox.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('admin_theme', 'dark'); 
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('admin_theme', 'light'); 
    }
    const chkLogin = document.getElementById('checkbox-login');
    const chkDash = document.getElementById('checkbox-dash');
    if (chkLogin) chkLogin.checked = checkbox.checked;
    if (chkDash) chkDash.checked = checkbox.checked;
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('admin_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const chkLogin = document.getElementById('checkbox-login');
        const chkDash = document.getElementById('checkbox-dash');
        if(chkLogin) chkLogin.checked = true;
        if(chkDash) chkDash.checked = true;
    }
}

// ==========================================
// 2. ĐĂNG NHẬP ADMIN (TỰ ĐỘNG LƯU PHIÊN)
// ==========================================
window.onload = () => {
    applySavedTheme();
    if (localStorage.getItem('admin_logged_in') === 'true') {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('dashboard').style.display = 'flex'; 
        loadClasses();
    }
};

function checkLogin() {
    const pass = document.getElementById('login-pass').value;
    const currentPass = localStorage.getItem('admin_password') || 'admin123'; 
    
    if (pass === currentPass) {
        localStorage.setItem('admin_logged_in', 'true');
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('dashboard').style.display = 'flex';
        loadClasses();
    } else {
        alert('❌ Sai mật khẩu quản lý!');
    }
}

// ==========================================
// 3. TẢI DỮ LIỆU TỪ GOOGLE SHEETS (JSON + RETRY)
// ==========================================
async function loadClasses() {
    const select = document.getElementById('class-select');
    select.innerHTML = '<option value="">⏳ Đang tải lớp...</option>';
    try {
        const data = await fetchWithRetry(`${scriptURL}?action=getClasses`);
        if (data.success && data.classes.length > 0) {
            select.innerHTML = '<option value="">-- Chọn lớp học phần --</option>';
            data.classes.forEach(cls => {
                select.innerHTML += `<option value="${cls}">📚 Lớp: ${cls}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Không có lớp nào</option>';
        }
    } catch (e) {
        select.innerHTML = '<option value="">❌ Lỗi mạng</option>';
    }
}

function handleClassChange() {
    loadDates();
}

async function loadDates() {
    const classId = document.getElementById('class-select').value;
    const dateSelect = document.getElementById('date-select');
    if (!classId) {
        dateSelect.innerHTML = '<option value="">-- Chọn ngày --</option>';
        return;
    }
    dateSelect.innerHTML = '<option value="">⏳ Đang tải ngày...</option>';
    try {
        const data = await fetchWithRetry(`${scriptURL}?action=getDates&classId=${encodeURIComponent(classId)}`);
        if (data.success && data.dates.length > 0) {
            dateSelect.innerHTML = '<option value="">-- Chọn ngày --</option>';
            data.dates.reverse().forEach(date => {
                dateSelect.innerHTML += `<option value="${date}">Ngày ${date}</option>`;
            });
        } else {
            dateSelect.innerHTML = '<option value="">Chưa có dữ liệu</option>';
        }
    } catch (e) { 
        dateSelect.innerHTML = '<option value="">❌ Lỗi tải ngày</option>'; 
    }
}

function refreshData() {
    loadStats();
}

async function loadStats() {
    const classId = document.getElementById('class-select').value;
    const dateStr = document.getElementById('date-select').value;
    const tableBody = document.getElementById('attendance-list'); 
    const totalElement = document.getElementById('total-present');
    const btnRef = document.getElementById('btnRef');

    if (!classId || !dateStr) {
        tableBody.innerHTML = '';
        totalElement.innerText = "0";
        return;
    }

    tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">⏳ Đang tải dữ liệu...</td></tr>';
    totalElement.innerText = "...";
    btnRef.innerText = "⏳ ĐANG LẤY...";
    btnRef.disabled = true;
    
    try {
        const data = await fetchWithRetry(`${scriptURL}?action=getStats&classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(dateStr)}`);

        currentDataList = data.list; 
        totalElement.innerText = data.total;

        if (data.total > 0) {
            tableBody.innerHTML = '';
            data.list.forEach(student => {
                tableBody.innerHTML += `
                    <tr>
                        <td style="font-weight: bold;">${student.mssv}</td>
                        <td>${student.name}</td>
                        <td style="color: var(--accent-color); font-weight: bold; text-align: center;">${student.time}</td>
                    </tr>
                `;
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--error);">Không có sinh viên nào điểm danh.</td></tr>';
        }
    } catch (e) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--error);">❌ Lỗi kết nối, vui lòng thử lại.</td></tr>';
    } finally {
        btnRef.innerText = "🔄 LÀM MỚI";
        btnRef.disabled = false;
    }
}

// ==========================================
// 4. CHỨC NĂNG TRA CỨU SINH VIÊN (MODAL)
// ==========================================
function showSearchModal() { document.getElementById('search-modal').style.display = 'flex'; }
function closeSearchModal() { 
    document.getElementById('search-modal').style.display = 'none'; 
    document.getElementById('search-result').style.display = 'none';
    document.getElementById('search-mssv').value = '';
}

async function searchStudent() {
    const mssv = document.getElementById('search-mssv').value.trim();
    const btnSearch = document.getElementById('btnSearch');
    const resultBox = document.getElementById('search-result');
    if (!mssv) return alert('⚠️ Vui lòng nhập MSSV cần tìm!');

    btnSearch.innerText = "ĐANG TÌM...";
    btnSearch.disabled = true;

    try {
        const data = await fetchWithRetry(`${scriptURL}?action=searchStudent&mssv=${mssv}`);
        if (data.success) {
            document.getElementById('res-mssv').innerText = data.mssv;
            document.getElementById('res-name').innerText = data.name;
            document.getElementById('res-pass').innerText = data.password;
            resultBox.style.display = 'block';
        } else {
            alert("❌ " + data.message);
            resultBox.style.display = 'none';
        }
    } catch(e) {
        alert('❌ Lỗi mạng! Đã thử 3 lần nhưng không thành công.');
    } finally {
        btnSearch.innerText = "TÌM KIẾM";
        btnSearch.disabled = false;
    }
}

// ==========================================
// 5. CHỨC NĂNG ĐỔI MẬT KHẨU ADMIN (MODAL)
// ==========================================
function showPassModal() { document.getElementById('password-modal').style.display = 'flex'; }
function closePassModal() { 
    document.getElementById('password-modal').style.display = 'none';
    document.getElementById('old-pass').value = '';
    document.getElementById('new-pass').value = '';
}

function updatePassword() {
    const oldPass = document.getElementById('old-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const currentPass = localStorage.getItem('admin_password') || 'admin123';
    
    if (oldPass !== currentPass) return alert('❌ Mật khẩu hiện tại không đúng!');
    if (newPass.length < 6) return alert('⚠️ Mật khẩu mới phải từ 6 ký tự!');
    
    localStorage.setItem('admin_password', newPass);
    alert('✅ Đổi mật khẩu thành công!');
    closePassModal();
}

// ==========================================
// 6. XUẤT FILE EXCEL
// ==========================================
function exportToExcel() {
    if (currentDataList.length === 0) {
        alert("⚠️ Chưa có dữ liệu điểm danh! Vui lòng chọn Lớp và Ngày.");
        return;
    }
    const classId = document.getElementById('class-select').value;
    const dateStr = document.getElementById('date-select').value.replace(/\//g, '-');
    
    const dataForExcel = [["MÃ SỐ SINH VIÊN", "HỌ VÀ TÊN", "THỜI GIAN ĐIỂM DANH"]];
    currentDataList.forEach(item => { dataForExcel.push([item.mssv, item.name, item.time]); });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataForExcel);
    ws['!cols'] = [{wch: 20}, {wch: 35}, {wch: 25}];
    
    XLSX.utils.book_append_sheet(wb, ws, "Danh Sách");
    XLSX.writeFile(wb, `DiemDanh_${classId}_Ngày_${dateStr}.xlsx`);
}
