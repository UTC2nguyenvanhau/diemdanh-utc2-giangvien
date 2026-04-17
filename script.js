// Thay Link Apps Script của bạn vào đây
const scriptURL = 'https://script.google.com/macros/s/AKfycbynGQ30GcS9Ww72xEDoIIZVhVEX_5eiGj0WgwxY9cd1PGoSg8m0wW36IQK9IRfUecbj/exec'; 
let currentDataList = [];

function getStoredPass() { return localStorage.getItem('admin_password') || '123456'; }

function initTheme() {
    const isDark = localStorage.getItem('admin_theme') === 'dark-mode';
    if (isDark) {
        document.body.classList.add('dark-mode');
        document.getElementById('checkbox-login').checked = true;
        document.getElementById('checkbox-dash').checked = true;
    }
}
initTheme();

function toggleTheme(element) {
    const isChecked = element.checked;
    document.body.classList.toggle('dark-mode', isChecked);
    localStorage.setItem('admin_theme', isChecked ? 'dark-mode' : 'light-mode');
    document.getElementById('checkbox-login').checked = isChecked;
    document.getElementById('checkbox-dash').checked = isChecked;
}

// Bắt sự kiện phím Enter
document.getElementById("login-pass").addEventListener("keypress", function(event) {
    if (event.key === "Enter") { event.preventDefault(); checkLogin(); }
});
document.getElementById("new-pass").addEventListener("keypress", function(event) {
    if (event.key === "Enter") { event.preventDefault(); updatePassword(); }
});
document.getElementById("search-mssv").addEventListener("keypress", function(event) {
    if (event.key === "Enter") { event.preventDefault(); searchStudent(); }
});

function checkLogin() {
    if (document.getElementById('login-pass').value === getStoredPass()) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadClasses(); 
    } else { alert("Sai mật khẩu!"); }
}

function showPassModal() { document.getElementById('password-modal').style.display = 'flex'; }
function closePassModal() { document.getElementById('password-modal').style.display = 'none'; }

function updatePassword() {
    const oldP = document.getElementById('old-pass').value;
    const newP = document.getElementById('new-pass').value;
    if (oldP !== getStoredPass()) { alert("Mật khẩu hiện tại không đúng!"); return; }
    if (newP.length < 4) { alert("Mật khẩu mới quá ngắn!"); return; }
    localStorage.setItem('admin_password', newP);
    alert("Đã đổi mật khẩu thành công!");
    document.getElementById('old-pass').value = ''; document.getElementById('new-pass').value = '';
    closePassModal();
}

function showSearchModal() { 
    document.getElementById('search-modal').style.display = 'flex'; 
    document.getElementById('search-result').style.display = 'none';
    document.getElementById('search-mssv').value = '';
}
function closeSearchModal() { document.getElementById('search-modal').style.display = 'none'; }

async function searchStudent() {
    const mssv = document.getElementById('search-mssv').value.trim();
    if (!mssv) return alert("Vui lòng nhập MSSV!");

    const btn = document.getElementById('btnSearch');
    btn.innerHTML = "ĐANG TÌM..."; btn.disabled = true;

    try {
        const res = await fetch(`${scriptURL}?action=searchStudent&mssv=${mssv}`);
        const data = await res.json();

        if (data.success) {
            document.getElementById('res-mssv').innerText = data.mssv;
            document.getElementById('res-name').innerText = data.name;
            document.getElementById('res-pass').innerText = data.password;
            document.getElementById('search-result').style.display = 'block';
        } else {
            alert(data.message);
            document.getElementById('search-result').style.display = 'none';
        }
    } catch (e) {
        alert("Lỗi kết nối mạng!");
    } finally {
        btn.innerHTML = "TÌM KIẾM"; btn.disabled = false;
    }
}

// --- TẢI DANH SÁCH LỚP ---
async function loadClasses() {
    const select = document.getElementById('class-select');
    try {
        const res = await fetch(`${scriptURL}?action=getClasses`);
        const data = await res.json();
        
        if (data.success && data.classes.length > 0) {
            select.innerHTML = '<option value="">-- Chọn lớp học --</option>';
            data.classes.forEach(cls => {
                let opt = document.createElement('option');
                opt.value = cls;
                opt.innerHTML = "📚 " + cls;
                select.appendChild(opt);
            });
        }
    } catch (e) { select.innerHTML = '<option value="">Lỗi tải lớp</option>'; }
}

// --- TẢI DANH SÁCH NGÀY THEO LỚP ---
async function handleClassChange() {
    const classId = document.getElementById('class-select').value;
    const dateSelect = document.getElementById('date-select');
    
    if (!classId) {
        dateSelect.innerHTML = '<option value="">-- Ngày --</option>';
        document.getElementById('attendance-list').innerHTML = "";
        document.getElementById('total-present').innerText = "0";
        return;
    }

    dateSelect.innerHTML = '<option value="">Đang tải...</option>';
    try {
        const res = await fetch(`${scriptURL}?action=getDates&classId=${encodeURIComponent(classId)}`);
        const data = await res.json();
        
        if (data.success && data.dates.length > 0) {
            dateSelect.innerHTML = '';
            data.dates.forEach(date => {
                let opt = document.createElement('option');
                opt.value = date;
                opt.innerHTML = "Ngày " + date;
                dateSelect.appendChild(opt);
            });
            
            // Chọn ngày mới nhất và hiển thị dữ liệu
            dateSelect.selectedIndex = data.dates.length - 1;
            refreshData();
        } else {
            dateSelect.innerHTML = '<option value="">Chưa có dữ liệu</option>';
            refreshData(); 
        }
    } catch (e) { dateSelect.innerHTML = '<option value="">Lỗi</option>'; }
}

// --- TẢI DỮ LIỆU ĐIỂM DANH ---
async function refreshData() {
    const classId = document.getElementById('class-select').value;
    const targetDate = document.getElementById('date-select').value;
    
    if (!classId) return;

    const btn = document.getElementById('btnRef');
    btn.innerHTML = "🔄 ĐANG TẢI..."; btn.disabled = true;
    try {
        let url = `${scriptURL}?action=getStats&classId=${encodeURIComponent(classId)}`;
        if (targetDate && targetDate !== "") {
            url += `&date=${encodeURIComponent(targetDate.replace("Ngày ", ""))}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        
        document.getElementById('total-present').innerText = data.total || 0;
        currentDataList = (data.list || []).reverse(); 
        
        const list = document.getElementById('attendance-list');
        list.innerHTML = "";
        
        if(currentDataList.length === 0) {
            list.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-gray); padding: 20px;">Chưa có sinh viên điểm danh ngày này</td></tr>`;
        } else {
            currentDataList.forEach(item => {
                list.innerHTML += `
                    <tr>
                        <td>${item.mssv}</td>
                        <td style="font-weight:700;">${item.name}</td>
                        <td style="color:var(--text-gray);">${item.time}</td>
                    </tr>`;
            });
        }
    } catch (e) { 
        alert("Lỗi tải dữ liệu!"); 
    } finally { 
        btn.innerHTML = "🔄 LÀM MỚI"; 
        btn.disabled = false; 
    }
}

function exportToExcel() {
    if (currentDataList.length === 0) {
        alert("Chưa có dữ liệu sinh viên nào để xuất!");
        return;
    }

    const classId = document.getElementById('class-select').value || "Chung";
    const dateStrFilter = document.getElementById('date-select').value.replace("Ngày ", "").replace(/\//g, '-') || "All";
    
    let csvContent = "MSSV,HỌ VÀ TÊN,THỜI GIAN ĐIỂM DANH\n";

    currentDataList.forEach(item => {
        csvContent += `"${item.mssv}","${item.name}","${item.time}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DiemDanh_${classId}_${dateStrFilter}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
