/* myFunctions.js
   - يستخدم jQuery
   - التحقق من الإدخالات، حفظ التطبيقات في localStorage، ونقل البيانات بين الصفحات.
*/

/* اسم المفتاح في localStorage */
const STORAGE_KEY = 'ai_apps_list_v1';

/* دوال مساعدة */
function loadAppsFromStorage(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return [];
  try{
    return JSON.parse(raw);
  }catch(e){
    console.error('خطأ بقراءة التخزين المحلي', e);
    return [];
  }
}
function saveAppsToStorage(arr){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

/* التحقق من صحة المدخلات طبقًا للمطلوب */
function validateAppForm(data){
  const errors = {};

  // اسم التطبيق: أحرف انجليزية فقط وبدون فراغات
  if(!data.name || !/^[A-Za-z]+$/.test(data.name)){
    errors.name = 'يجب إدخال اسم التطبيق بأحرف إنجليزية فقط ولا يحتوي فراغات.';
  }

  // الشركة المصنعة: أحرف عربية فقط (نسمح بالمسافات)
  if(!data.company || !/^[\u0600-\u06FF\s]+$/.test(data.company)){
    errors.company = 'اسم الشركة يجب أن يكون أحرفًا هجائية عربية فقط.';
  }

  // موقع إلكتروني - تحقق بواسطة URL constructor
  try{
    const url = new URL(data.website);
    if(!['http:','https:'].includes(url.protocol)){
      errors.website = 'أدخل رابطًا صحيحًا يبدأ بـ http:// أو https://';
    }
  }catch(e){
    errors.website = 'أدخل رابطًا صحيحًا (URL). مثال: https://example.com';
  }

  // مجاني: يجب أن يكون 'yes' أو 'no'
  if(!(data.free === 'yes' || data.free === 'no')){
    errors.free = 'اختر إذا كان التطبيق مجانيًا أم لا.';
  }

  // مجال الاستخدام: يجب أن يكون واحدًا من القيم المحددة
  const allowed = ['E-Commerce','Education','Robotics'];
  if(!allowed.includes(data.domain)){
    errors.domain = 'اختر مجالًا من القائمة المحددة.';
  }

  // شرح مختصر: وجود نص لا يقل عن 10 أحرف
  if(!data.summary || data.summary.trim().length < 10){
    errors.summary = 'الشرح المختصر يجب أن لا يقل عن 10 أحرف.';
  }

  return errors;
}

/* يستدعى عند تحميل صفحة app.html لترسم الجدول */
function renderAppsTable(containerSelector){
  const apps = loadAppsFromStorage();
  const $c = $(containerSelector);
  $c.empty();

  if(apps.length === 0){
    $c.append('<div class="card"><p class="kv">لا توجد تطبيقات مضافة حالياً.</p></div>');
    return;
  }

  // بناء الجدول
  const $table = $('<table class="table card"></table>');
  const thead = `<thead><tr><th>اسم التطبيق</th><th>الشركة</th><th>المجال</th><th>مجاني</th><th>تفاصيل</th></tr></thead>`;
  $table.append(thead);
  const $tbody = $('<tbody></tbody>');
  apps.forEach((app, idx) => {
    const tr = $(`
      <tr data-idx="${idx}">
        <td><div class="app-row"><img src="${app.logo||''}" class="logo-sm" onerror="this.style.display='none'"><div><strong>${app.name}</strong></div></div></td>
        <td>${app.company}</td>
        <td>${app.domain}</td>
        <td>${app.free === 'yes' ? 'نعم' : 'لا'}</td>
        <td><div class="toggle-square" title="إظهار/إخفاء التفاصيل" data-idx="${idx}">▢</div></td>
      </tr>
    `);
    // تفاصيل مخفية تحت كل صف
    const detailsHtml = $(`
      <tr class="details-row" style="display:none" data-for="${idx}">
        <td colspan="5">
          <div class="details-panel">
            <div><strong>موقع التطبيق:</strong> <a href="${app.website}" target="_blank">${app.website}</a></div>
            <div style="margin-top:8px;"><strong>شرح مختصر:</strong> <div class="kv">${app.summary}</div></div>
            <div style="margin-top:8px;display:flex;gap:12px;align-items:center">
              ${app.logo?`<img src="${app.logo}" class="logo-sm" alt="logo">` : ''}
              ${app.media?`<div><audio controls src="${app.media}" style="max-width:280px"></audio></div>` : ''}
            </div>
          </div>
        </td>
      </tr>
    `);
    $tbody.append(tr);
    $tbody.append(detailsHtml);
  });
  $table.append($tbody);
  $c.append($table);

  // حدث النقر على المربع لتبديل التفاصيل (يمكن فتح عدة)
  $table.find('.toggle-square').on('click', function(){
    const idx = $(this).attr('data-idx');
    const $detailsRow = $table.find(`.details-row[data-for="${idx}"]`);
    $detailsRow.slideToggle(180);
    $(this).toggleClass('open');
  });
}

/* عند إرسال نموذج إضافة التطبيق */
function submitAppForm(formSelector, onSuccessRedirect = 'app.html'){
  const $f = $(formSelector);
  // جمع القيم
  const data = {
    name: $f.find('[name="name"]').val().trim(),
    company: $f.find('[name="company"]').val().trim(),
    website: $f.find('[name="website"]').val().trim(),
    free: $f.find('[name="free"]:checked').val() || '',
    domain: $f.find('[name="domain"]').val(),
    summary: $f.find('[name="summary"]').val().trim(),
    logo: $f.find('[name="logo"]').val().trim(), // نقبل رابط للصورة
    media: $f.find('[name="media"]').val().trim() // رابط صوت/فيديو (اختياري)
  };

  const errors = validateAppForm(data);

  // عرض أخطاء إذا وُجدت
  $f.find('.form-error').remove();
  if(Object.keys(errors).length > 0){
    for(const key in errors){
      const $el = $f.find('[name="'+key+'"]');
      if($el.length){
        $el.after('<div class="form-error error" style="margin-top:6px">'+errors[key]+'</div>');
      }
    }
    return false;
  }

  // حفظ في localStorage
  const apps = loadAppsFromStorage();
  apps.unshift(data); // نضيف في المقدمة
  saveAppsToStorage(apps);

  // تحويل إلى صفحة التطبيقات
  window.location.href = onSuccessRedirect;
  return true;
}

/* إعادة تهيئة الحقول للقيم الافتراضية */
function resetAppForm(formSelector){
  $(formSelector)[0].reset();
}


$(document).ready(function () {
    // عرض وإخفاء تفاصيل التطبيقات في app.html
    $(".details-row").hide();
    $(".details-btn").click(function () {
        $(this).closest("tr").next(".details-row").slideToggle(400);
    });

    // التحقق من صحة النموذج في add_app.html
    $("#submitBtn").click(function () {
        let appName = $("#appName").val().trim();
        let companyName = $("#companyName").val().trim();
        let website = $("#website").val().trim();
        let free = $("#free").val();
        let field = $("#field").val();
        let desc = $("#desc").val().trim();
        let msg = $("#formMsg");

        // التحقق من القيم
        const nameRegex = /^[A-Za-z]+$/;
        const arabicRegex = /^[\u0600-\u06FF\s]+$/;
        const urlRegex = /^(https?:\/\/)[^\s$.?#].[^\s]*$/gm;

        if (!appName || !nameRegex.test(appName)) {
            msg.text("❌ اسم التطبيق يجب أن يكون باللغة الإنجليزية بدون فراغات.").css("color", "red");
            return;
        }
        if (!companyName || !arabicRegex.test(companyName)) {
            msg.text("❌ اسم الشركة يجب أن يكون باللغة العربية فقط.").css("color", "red");
            return;
        }
        if (!website || !urlRegex.test(website)) {
            msg.text("❌ الرجاء إدخال موقع إلكتروني صالح (URL).").css("color", "red");
            return;
        }
        if (!free) {
            msg.text("❌ الرجاء تحديد ما إذا كان التطبيق مجانيًا.").css("color", "red");
            return;
        }
        if (!field) {
            msg.text("❌ الرجاء اختيار مجال الاستخدام.").css("color", "red");
            return;
        }
        if (!desc || desc.length < 10) {
            msg.text("❌ الرجاء إدخال شرح مختصر لا يقل عن 10 أحرف.").css("color", "red");
            return;
        }

        // نجاح الإدخال
        msg.text("✅ تم إرسال المعلومات بنجاح! سيتم نقلك إلى صفحة التطبيقات...")
           .css("color", "#00ff9d");

        setTimeout(() => {
            window.location.href = "app.html";
        }, 2000);
    });
});