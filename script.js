// ===== PENGATURAN ADMIN =====
const CONFIG={
  SHEET_URL:'https://script.google.com/macros/s/AKfycbwXnbrkRuuKORSflSPbDcrq1sEMJvpQM1FqbgzpymA60zmsRJeYy9faTzUIjRTB3gB1/exec',          // tempel URL Web App Google Apps Script di sini (lihat code.gs)
  TOKEN:'PORSIKU1234', // harus sama dengan TOKEN di code.gs
  WA:'6288233519968',    // WhatsApp ahli gizi (format 62...)
  HARGA:0                // nominal konsultasi dalam rupiah, 0 = tidak ditampilkan
};
const ALERGI=['Telur','Susu','Kacang','Seafood','Gluten','Kedelai'];
const FOTO=['photo-1490645935967-10de6ba17061','photo-1512621776951-a57141f2eefd','photo-1498837167922-ddd27525d352','photo-1546069901-ba9599a7e63c','photo-1540420773420-3366772f4999','photo-1467003909585-2f8a72700288','photo-1504674900247-0877df9cc836'];
const u=id=>`https://images.unsplash.com/${id}?w=600&q=80`;

// Indikator kegiatan sehari-hari (faktor aktivitas 1,1 – 1,9)
const AKT=[
 [1.1,'Sangat rendah','Sebagian besar waktu berbaring atau duduk; perawatan diri dasar, sangat sedikit berjalan.'],
 [1.2,'Sedenter','Bekerja/belajar sambil duduk, pakai komputer, membaca, menonton, berjalan singkat di rumah.'],
 [1.3,'Sedenter + sedikit bergerak','Mayoritas duduk, sesekali berdiri, berjalan mengambil barang, pindah jarak dekat.'],
 [1.4,'Aktivitas ringan','Belajar/bekerja sambil duduk, memasak, mencuci piring, merapikan kamar, berjalan singkat.'],
 [1.5,'Ringan menuju sedang','Pekerjaan rumah rutin, lebih sering berjalan, aktivitas fisik ringan durasi lebih panjang.'],
 [1.6,'Aktivitas sedang','Banyak berjalan, bersepeda santai, pekerjaan rumah cukup aktif, atau olahraga sedang rutin.'],
 [1.7,'Sedang menuju tinggi','Aktivitas fisik durasi panjang, banyak berjalan, pekerjaan yang menuntut gerak hampir seharian.'],
 [1.8,'Aktivitas tinggi','Pekerjaan lapangan aktif, banyak berjalan, mengangkat barang, atau latihan berat rutin.'],
 [1.9,'Sangat tinggi','Pekerjaan fisik berat + latihan intens, atau aktivitas fisik berdurasi panjang.']];
const TABEL={
 'Indikator harian':{head:['Faktor','Kategori','Rincian kegiatan sehari-hari'],rows:AKT.map(a=>[a[0].toFixed(1).replace('.',','),a[1],a[2]]),note:'Faktor ini yang dikalikan dengan BMR untuk total energi.'},
 'Anak & dewasa':{head:['Aktivitas fisik','Anak L','Anak P','Dewasa L','Dewasa P'],rows:[['Ringan','1,00','1,00','1,00','1,00'],['Aktivitas rendah','1,13','1,16','1,11','1,12'],['Aktif','1,26','1,31','1,25','1,27'],['Sangat aktif','1,46','1,56','1,48','1,56']],note:'Tabel referensi. Kolom yang menyala sesuai kelompokmu.'},
 'Perempuan':{head:['Aktivitas','Jenis kegiatan','Faktor'],rows:[['Sangat ringan','100% waktu berdiri/duduk','1,30'],['Ringan','75% berdiri/duduk, 25% aktivitas lain','1,55'],['Sedang','60% berdiri/duduk, 40% aktivitas lain','1,70'],['Berat','40% berdiri/duduk, 60% aktivitas lain','2,00']],note:'Sumber: Almatsier S, 2011.'}};
const SLOT_U=[['Makan pagi',.25],['Makan siang',.30],['Makan malam',.25]],SLOT_S=[['Selingan pagi',.10],['Selingan sore',.10]];

const $=s=>document.querySelector(s);
const fmt=(n,d=1)=>(+n).toFixed(d).replace('.',',');
let user=JSON.parse(localStorage.getItem('porsiku')||'null'),tab='Indikator harian';

$('#acts').innerHTML=AKT.map((a,i)=>`<label><input type="radio" name="af" value="${a[0]}" ${i==1?'checked':''}><span><em>${a[0].toFixed(1)}</em><b>${a[1]}</b>${a[2]}</span></label>`).join('');
$('#alergi').innerHTML=ALERGI.map(x=>`<label><input type="checkbox" name="alergi" value="${x.toLowerCase()}"><span>${x}</span></label>`).join('');
const strip=FOTO.concat(FOTO).map(f=>`<img src="${u(f)}" alt="" loading="lazy" onerror="this.style.opacity=.2">`).join('');
$('#m1').innerHTML=strip;$('#m2').innerHTML=strip;

function show(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$('#'+id).classList.add('active');scrollTo(0,0);$('#navBtn').textContent=user?'Dashboard':'Mulai'}
function startFlow(){if(user){render();show('dashboard')}else show('onboarding')}
$('#form').onsubmit=e=>{
  e.preventDefault();const f=new FormData(e.target);
  user={nama:f.get('nama'),jk:f.get('jk'),usia:+f.get('usia'),bb:+f.get('bb'),tb:+f.get('tb'),af:+f.get('af'),alergi:f.getAll('alergi')};
  localStorage.setItem('porsiku',JSON.stringify(user));render();show('dashboard');kirim({tipe:'pengguna',...ringkas()});
};

function hitung(x){
  const imt=x.bb/Math.pow(x.tb/100,2);
  const kat=imt<18.5?'Kurus':imt<=25?'Normal':imt<=27?'Gemuk':'Obesitas';
  // Harris-Benedict
  const bmr=x.jk==='L'?66+13.7*x.bb+5*x.tb-6.8*x.usia:655+9.6*x.bb+1.8*x.tb-4.7*x.usia;
  const tee=bmr*x.af;
  return{imt,kat,bmr,tee,p:tee*.15/4,l:tee*.25/9,kh:tee*.60/4};
}

function render(){
  const h=hitung(user),akt=AKT.find(a=>a[0]===user.af);
  $('#halo').textContent=`Halo, ${user.nama} 👋`;
  $('#ringkas').textContent=`${user.jk==='L'?'Laki-laki':'Perempuan'} · ${user.usia} th · ${user.bb} kg · ${user.tb} cm · ${akt[1]}`;
  $('#stats').innerHTML=`
   <div class="stat big"><span>Kebutuhan energi per hari</span><b>${Math.round(h.tee)} kkal</b><p class="small">BMR ${Math.round(h.bmr)} kkal × faktor aktivitas ${fmt(user.af)}</p></div>
   <div class="stat lime"><span>IMT</span><b>${fmt(h.imt)}</b><span>${h.kat}${user.usia<18?' · anak pakai Z-score':''}</span></div>
   <div class="stat"><span>BMR Harris-Benedict</span><b>${Math.round(h.bmr)}</b><span>kkal/hari</span></div>
   <div class="stat"><span>Protein (15%)</span><b>${Math.round(h.p)} g</b></div>
   <div class="stat"><span>Lemak (25%)</span><b>${Math.round(h.l)} g</b></div>
   <div class="stat"><span>Karbohidrat (60%)</span><b>${Math.round(h.kh)} g</b></div>`;
  renderTabel();renderResep(h);
}

function renderTabel(){
  $('#tabs').innerHTML=Object.keys(TABEL).map(k=>`<button class="${k===tab?'on':''}" onclick="tab='${k}';renderTabel()">${k}</button>`).join('');
  const t=TABEL[tab],af=fmt(user.af);
  const col=tab==='Anak & dewasa'?(user.usia<18?0:2)+(user.jk==='L'?1:2):-1;
  $('#tabel').innerHTML='<tr>'+t.head.map((x,i)=>`<th class="${i===col?'hi':''}">${x}</th>`).join('')+'</tr>'+
   t.rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${(tab==='Indikator harian'&&r[0]===af)||i===col?'hi':''}">${c}</td>`).join('')}</tr>`).join('');
  $('#catatan').textContent=t.note;
}

function pilih(jenis,slots,h){
  const ok=RESEP.filter(r=>r.jenis===jenis&&!r.alergen.some(a=>user.alergi.includes(a)));
  const share=slots.reduce((s,x)=>s+x[1],0)/slots.length;
  return ok.map(r=>{
    let s=-Math.abs(Math.log(h.tee*share/r.tot[0]));
    const lp=r.tot[2]*9/r.tot[0];
    if(h.kat==='Kurus')s+=r.tot[0]/2000;
    if(h.kat==='Gemuk'||h.kat==='Obesitas')s-=lp;
    return[s,r];
  }).sort((a,b)=>b[0]-a[0]).slice(0,slots.length).map(x=>x[1]);
}

function kartu(r,slot,share,h,i){
  const target=h.tee*share,m=Math.min(3,Math.max(.5,Math.round(target/r.tot[0]*4)/4));
  const t=r.tot.map(v=>v*m),need=[target,target*.15/4,target*.25/9,target*.60/4];
  const rows=r.bahan.map(b=>`<tr><td>${b[0]}</td><td>${b[1]||'-'}</td><td>${fmt(b[2]*m)}</td><td>${fmt(b[3]*m)}</td><td>${fmt(b[4]*m)}</td><td>${fmt(b[5]*m)}</td><td>${fmt(b[6]*m)}</td></tr>`).join('');
  return `<article class="recipe"><img src="${u(FOTO[(r.id+i)%FOTO.length])}" alt="${r.nama}" onerror="this.removeAttribute('src')">
   <div class="rbody"><span class="slot">${slot}</span><h4>${r.nama}</h4>
   <span class="badge">porsi ×${fmt(m,2)}</span><span class="badge">${Math.round(t[0])} kkal</span><span class="badge">P ${fmt(t[1])} g</span><span class="badge">L ${fmt(t[2])} g</span><span class="badge">KH ${fmt(t[3])} g</span>
   <details><summary>Lihat bahan & perhitungan gizi</summary><div class="table-wrap"><table>
   <tr><th>Bahan</th><th>URT ×1</th><th>Berat (g)</th><th>Energi</th><th>Prot</th><th>Lemak</th><th>KH</th></tr>${rows}
   <tr><th colspan="3">Total nilai gizi</th>${t.map(v=>`<th>${fmt(v)}</th>`).join('')}</tr>
   <tr><td colspan="3">Kebutuhan ${slot.toLowerCase()}</td>${need.map(v=>`<td>${fmt(v)}</td>`).join('')}</tr>
   <tr class="tkg"><td colspan="3">TKG (%)</td>${t.map((v,j)=>`<td>${Math.round(v/need[j]*100)}</td>`).join('')}</tr>
   </table></div></details></div></article>`;
}

function renderResep(h){
  const U=pilih('utama',SLOT_U,h),S=pilih('selingan',SLOT_S,h);
  $('#resepInfo').textContent=`Porsi tiap menu disesuaikan dengan kebutuhan ${Math.round(h.tee)} kkal kamu${user.alergi.length?' dan bebas '+user.alergi.join(', '):''}. TKG = tingkat kecukupan gizi terhadap kebutuhan waktu makan itu.`;
  const html=U.map((r,i)=>kartu(r,SLOT_U[i][0],SLOT_U[i][1],h,i)).join('')+S.map((r,i)=>kartu(r,SLOT_S[i][0],SLOT_S[i][1],h,i+3)).join('');
  $('#resep').innerHTML=html||'<p class="muted">Belum ada menu yang aman dari alergimu.</p>';
}
if(user)render();

// ===== Simpan ke Google Sheets (bisa diunduh sebagai Excel) =====
function ringkas(){
  const h=hitung(user),a=AKT.find(x=>x[0]===user.af);
  return{nama:user.nama,jk:user.jk==='L'?'Laki-laki':'Perempuan',usia:user.usia,bb:user.bb,tb:user.tb,
    aktivitas:`${fmt(user.af)} – ${a[1]}`,alergi:user.alergi.join(', ')||'-',
    imt:+h.imt.toFixed(1),kategori:h.kat,bmr:Math.round(h.bmr),tee:Math.round(h.tee)};
}
function kirim(data){
  if(!CONFIG.SHEET_URL)return;
  fetch(CONFIG.SHEET_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({token:CONFIG.TOKEN,...data})}).catch(()=>{});
}

// ===== Konsultasi: bayar QRIS lalu kirim ke WhatsApp =====
function openKonsul(){
  if(!user){alert('Isi datamu dulu ya, supaya ahli gizi punya gambaran kondisimu.');show('onboarding');return}
  $('#harga').textContent=CONFIG.HARGA?'Nominal: Rp '+CONFIG.HARGA.toLocaleString('id-ID'):'';
  $('#modal').hidden=false;
}
function closeKonsul(){$('#modal').hidden=true}
$('#sudahBayar').onchange=e=>$('#waBtn').disabled=!e.target.checked;
$('#modal').onclick=e=>{if(e.target.id==='modal')closeKonsul()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeKonsul()});
function kirimWA(){
  const r=ringkas(),k=$('#keluhan').value.trim()||'-';
  const pesan=`Halo ahli gizi Porsiku 👋
Saya ingin konsultasi.

Nama: ${r.nama}
Jenis kelamin: ${r.jk}
Usia: ${r.usia} tahun
BB / TB: ${r.bb} kg / ${r.tb} cm
IMT: ${r.imt} (${r.kategori})
Kebutuhan energi: ${r.tee} kkal/hari (BMR ${r.bmr} kkal, faktor ${r.aktivitas})
Alergi: ${r.alergi}
Keluhan/pertanyaan: ${k}

Saya sudah membayar via QRIS dan akan melampirkan bukti bayar di chat ini.`;
  kirim({tipe:'konsultasi',...r,keluhan:k});
  window.open(`https://wa.me/${CONFIG.WA}?text=${encodeURIComponent(pesan)}`,'_blank');
  closeKonsul();
}
