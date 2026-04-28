const scriptURL = 'https://script.google.com/macros/s/AKfycbwi-MDO-wehI0SNdkVqaW_gDLpCkPrDKToIQhLs3qkXcLUjNtJFriKGaQF6lXAzdJ7R/exec'; 
let currentDataList = []; 

function toggleTheme(checkbox) {
    if(checkbox.checked) { document.body.classList.add('dark-mode'); localStorage.setItem('admin_theme', 'dark'); } 
    else { document.body.classList.remove('dark-mode'); localStorage.setItem('admin_theme', 'light'); }
    ['checkbox-login', 'checkbox-dash'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = checkbox.checked; });
}

function applySavedTheme() {
    if (localStorage.getItem('admin_theme') === 'dark') {
        document.body.classList.add('dark-mode');
        ['checkbox-login', 'checkbox-dash'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; });
    }
}

window.onload = () => {
    applySavedTheme();
    if (localStorage.getItem('admin_logged_in') === 'true') {
        document.getElementById('login-overlay').style.display = 'none'; document.getElementById('dashboard').style.display = 'flex'; loadClasses();
    }
};

function checkLogin() {
    const pass = document.getElementById('login-pass').value; const currentPass = localStorage.getItem('admin_password') || 'admin123'; 
    if (pass === currentPass) { localStorage.setItem('admin_logged_in', 'true'); document.getElementById('login-overlay').style.display = 'none'; document.getElementById('dashboard').style.display = 'flex'; loadClasses(); } 
    else { alert('❌ Sai mật khẩu quản lý!'); }
}

async function loadClasses() {
    const select = document.getElementById('class-select'); select.innerHTML = '<option value="">⏳ Đang tải lớp...</option>';
    try {
        const res = await fetch(`${scriptURL}?action=getClasses`);
        const data = await res.json();
        if (data.success && data.classes.length > 0) { 
            select.innerHTML = '<option value="">-- Chọn lớp học phần --</option>'; 
            data.classes.forEach(cls => { select.innerHTML += `<option value="${cls}">📚 Lớp: ${cls}</option>`; }); 
        } else { select.innerHTML = '<option value="">Không có lớp nào</option>'; }
    } catch (e) { select.innerHTML = '<option value="">❌ Lỗi mạng</option>'; }
}

function handleClassChange() { loadDates(); }

async function loadDates() {
    const classId = document.getElementById('class-select').value; const dateSelect = document.getElementById('date-select');
    if (!classId) { dateSelect.innerHTML = '<option value="">-- Chọn ngày --</option>'; return; }
    dateSelect.innerHTML = '<option value="">⏳ Đang tải ngày...</option>';
    try {
        const res = await fetch(`${scriptURL}?action=getDates&classId=${encodeURIComponent(classId)}`);
        const data = await res.json();
        if (data.success && data.dates.length > 0) { 
            dateSelect.innerHTML = '<option value="">-- Chọn ngày --</option>'; 
            data.dates.reverse().forEach(date => { dateSelect.innerHTML += `<option value="${date}">Ngày ${date}</option>`; }); 
        } else { dateSelect.innerHTML = '<option value="">Chưa có dữ liệu</option>'; }
    } catch (e) { dateSelect.innerHTML = '<option value="">❌ Lỗi tải ngày</option>'; }
}

function refreshData() { loadStats(); }

async function loadStats() {
    const classId = document.getElementById('class-select').value; const dateStr = document.getElementById('date-select').value;
    const tableBody = document.getElementById('attendance-list'); const totalElement = document.getElementById('total-present'); const btnRef = document.getElementById('btnRef');
    if (!classId || !dateStr) { tableBody.innerHTML = ''; totalElement.innerText = "0"; return; }
    tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">⏳ Đang tải...</td></tr>'; totalElement.innerText = "..."; btnRef.innerText = "⏳ ĐANG LẤY..."; btnRef.disabled = true;
    
    try {
        const res = await fetch(`${scriptURL}?action=getStats&classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(dateStr)}`);
        const data = await res.json();
        currentDataList = data.list; totalElement.innerText = data.total;
        if (data.total > 0) { 
            tableBody.innerHTML = ''; 
            data.list.forEach(student => { tableBody.innerHTML += `<tr><td style="font-weight: bold; text-align:center;">${student.mssv}</td><td>${student.name}</td><td style="color: var(--accent-color); font-weight: bold; text-align: center;">${student.time}</td></tr>`; }); 
        } else { tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--error);">Không có sinh viên nào điểm danh.</td></tr>'; }
    } catch (e) { tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--error);">❌ Lỗi mạng, thử lại sau.</td></tr>'; } 
    finally { btnRef.innerText = "🔄 LÀM MỚI"; btnRef.disabled = false; }
}

function showSearchModal() { document.getElementById('search-modal').style.display = 'flex'; }
function closeSearchModal() { document.getElementById('search-modal').style.display = 'none'; document.getElementById('search-result').style.display = 'none'; document.getElementById('search-mssv').value = ''; }

async function searchStudent() {
    const mssv = document.getElementById('search-mssv').value.trim(); const btnSearch = document.getElementById('btnSearch'); const resultBox = document.getElementById('search-result');
    if (!mssv) return alert('⚠️ Vui lòng nhập MSSV!'); btnSearch.innerText = "ĐANG TÌM..."; btnSearch.disabled = true;
    try {
        const res = await fetch(`${scriptURL}?action=searchStudent&mssv=${mssv}`);
        const data = await res.json();
        if (data.success) { 
            document.getElementById('res-mssv').innerText = data.mssv; document.getElementById('res-name').innerText = data.name; document.getElementById('res-pass').innerText = data.password; resultBox.style.display = 'block'; 
        } else { alert("❌ " + data.message); resultBox.style.display = 'none'; }
    } catch(e) { alert('❌ Lỗi mạng!'); } finally { btnSearch.innerText = "TÌM KIẾM"; btnSearch.disabled = false; }
}

function showPassModal() { document.getElementById('password-modal').style.display = 'flex'; }
function closePassModal() { document.getElementById('password-modal').style.display = 'none'; document.getElementById('old-pass').value = ''; document.getElementById('new-pass').value = ''; }
function updatePassword() {
    const oldPass = document.getElementById('old-pass').value; const newPass = document.getElementById('new-pass').value; const currentPass = localStorage.getItem('admin_password') || 'admin123';
    if (oldPass !== currentPass) return alert('❌ Mật khẩu hiện tại không đúng!'); if (newPass.length < 6) return alert('⚠️ Mật khẩu mới phải từ 6 ký tự!');
    localStorage.setItem('admin_password', newPass); alert('✅ Đổi mật khẩu thành công!'); closePassModal();
}

async function forceSyncData() {
    if(!confirm("Bạn vừa sửa dữ liệu trực tiếp trên Sheet? Hãy bấm OK để hệ thống cập nhật mới.")) return;
    try {
        const res = await fetch(`${scriptURL}?action=clearCache`);
        const data = await res.json();
        if(data.success) { alert("✅ " + data.message); window.location.reload(); }
    } catch (e) { alert("❌ Lỗi mạng!"); }
}

function exportToExcel() {
    if (currentDataList.length === 0) return alert("⚠️ Chưa có dữ liệu điểm danh!");
    const classId = document.getElementById('class-select').value; const dateStr = document.getElementById('date-select').value.replace(/\//g, '-');
    const dataForExcel = [["MÃ SỐ SINH VIÊN", "HỌ VÀ TÊN", "THỜI GIAN ĐIỂM DANH"]];
    currentDataList.forEach(item => { dataForExcel.push([item.mssv, item.name, item.time]); });
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet(dataForExcel); ws['!cols'] = [{wch: 20}, {wch: 35}, {wch: 25}];
    XLSX.utils.book_append_sheet(wb, ws, "Danh Sách"); XLSX.writeFile(wb, `DiemDanh_${classId}_Ngày_${dateStr}.xlsx`);
}
