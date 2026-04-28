const scriptURL = 'https://script.google.com/macros/s/AKfycbytXOd7q3oxAArpRvJOfQGz4TtXz1JPljLEVdSwMl3nPBG_GbAAU4cFrQ0li3g9sZIA/exec'; 
let currentDataList = []; 

function toggleTheme(cb) { if(cb.checked) { document.body.classList.add('dark-mode'); localStorage.setItem('admin_theme', 'dark'); } else { document.body.classList.remove('dark-mode'); localStorage.setItem('admin_theme', 'light'); } ['checkbox-login', 'checkbox-dash'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = cb.checked; }); }
function applySavedTheme() { if (localStorage.getItem('admin_theme') === 'dark') { document.body.classList.add('dark-mode'); ['checkbox-login', 'checkbox-dash'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; }); } }
window.onload = () => { applySavedTheme(); if (localStorage.getItem('admin_logged_in') === 'true') { document.getElementById('login-overlay').style.display = 'none'; document.getElementById('dashboard').style.display = 'flex'; loadClasses(); } };

function checkLogin() { const pass = document.getElementById('login-pass').value; if (pass === (localStorage.getItem('admin_password') || 'admin123')) { localStorage.setItem('admin_logged_in', 'true'); window.location.reload(); } else alert('❌ Sai mật khẩu!'); }

async function loadClasses() {
    const sel = document.getElementById('class-select'); sel.innerHTML = '<option>⏳ Tải lớp...</option>';
    try { const res = await fetch(`${scriptURL}?action=getClasses`); const data = await res.json(); if (data.success) { sel.innerHTML = '<option value="">-- Chọn lớp --</option>'; data.classes.forEach(c => sel.innerHTML += `<option value="${c}">📚 Lớp: ${c}</option>`); } } catch (e) { sel.innerHTML = '<option>❌ Lỗi</option>'; }
}

async function loadDates() {
    const cid = document.getElementById('class-select').value; const sel = document.getElementById('date-select'); if (!cid) return; sel.innerHTML = '<option>⏳ Tải ngày...</option>';
    try { const res = await fetch(`${scriptURL}?action=getDates&classId=${encodeURIComponent(cid)}`); const data = await res.json(); if (data.success) { sel.innerHTML = '<option value="">-- Chọn ngày --</option>'; data.dates.reverse().forEach(d => sel.innerHTML += `<option value="${d}">Ngày ${d}</option>`); } } catch (e) { sel.innerHTML = '<option>❌ Lỗi</option>'; }
}
function handleClassChange() { loadDates(); }
function refreshData() { loadStats(); }

async function loadStats() {
    const cid = document.getElementById('class-select').value; const date = document.getElementById('date-select').value; const tb = document.getElementById('attendance-list'); const tot = document.getElementById('total-present'); const btn = document.getElementById('btnRef');
    if (!cid || !date) return; tb.innerHTML = '<tr><td colspan="3" align="center">⏳ Đang tải...</td></tr>'; btn.innerText = "⏳ LẤY..."; btn.disabled = true;
    try {
        const res = await fetch(`${scriptURL}?action=getStats&classId=${encodeURIComponent(cid)}&date=${encodeURIComponent(date)}`); const data = await res.json(); currentDataList = data.list; tot.innerText = data.total;
        if (data.total > 0) { tb.innerHTML = ''; data.list.forEach(s => tb.innerHTML += `<tr><td style="font-weight:bold;">${s.mssv}</td><td>${s.name}</td><td style="color:var(--accent-color); font-weight:bold;" align="center">${s.time}</td></tr>`); } else tb.innerHTML = '<tr><td colspan="3" align="center" style="color:red;">Không có DL</td></tr>';
    } catch (e) { tb.innerHTML = '<tr><td colspan="3" align="center" style="color:red;">❌ Lỗi mạng</td></tr>'; } finally { btn.innerText = "🔄 LÀM MỚI"; btn.disabled = false; }
}

function showSearchModal() { document.getElementById('search-modal').style.display = 'flex'; }
function closeSearchModal() { document.getElementById('search-modal').style.display = 'none'; document.getElementById('search-result').style.display = 'none'; }
async function searchStudent() { const m = document.getElementById('search-mssv').value.trim(); const btn = document.getElementById('btnSearch'); const resB = document.getElementById('search-result'); if (!m) return; btn.innerText = "TÌM..."; btn.disabled = true; try { const res = await fetch(`${scriptURL}?action=searchStudent&mssv=${m}`); const data = await res.json(); if (data.success) { document.getElementById('res-mssv').innerText = data.mssv; document.getElementById('res-name').innerText = data.name; document.getElementById('res-pass').innerText = data.password; resB.style.display = 'block'; } else alert("❌ Lỗi"); } catch(e) {} finally { btn.innerText = "TÌM KIẾM"; btn.disabled = false; } }

function showPassModal() { document.getElementById('password-modal').style.display = 'flex'; }
function closePassModal() { document.getElementById('password-modal').style.display = 'none'; }
function updatePassword() { const op = document.getElementById('old-pass').value; const np = document.getElementById('new-pass').value; if (op !== (localStorage.getItem('admin_password') || 'admin123')) return alert('❌ Mật khẩu cũ sai!'); if (np.length < 6) return alert('⚠️ Quá ngắn!'); localStorage.setItem('admin_password', np); alert('✅ Đã lưu!'); closePassModal(); }

async function forceSyncData() { if(!confirm("Đồng bộ Cache với Google Sheets?")) return; try { const res = await fetch(`${scriptURL}?action=clearCache`); const data = await res.json(); if(data.success) { alert("✅ " + data.message); window.location.reload(); } } catch (e) { alert("❌ Lỗi!"); } }
function exportToExcel() { if (!currentDataList.length) return alert("⚠️ Trống!"); const cid = document.getElementById('class-select').value; const ds = document.getElementById('date-select').value.replace(/\//g, '-'); const d = [["MSSV", "HỌ TÊN", "THỜI GIAN"]]; currentDataList.forEach(i => d.push([i.mssv, i.name, i.time])); const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet(d); ws['!cols'] = [{wch:15}, {wch:35}, {wch:20}]; XLSX.utils.book_append_sheet(wb, ws, "DL"); XLSX.writeFile(wb, `DD_${cid}_${ds}.xlsx`); }
