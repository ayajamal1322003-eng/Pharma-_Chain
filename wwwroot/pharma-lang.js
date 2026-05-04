/* =========================================================
   PharmaChain i18n Engine — pharma-lang.js
   Supports: Arabic (RTL) ↔ English (LTR)
   ========================================================= */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     TRANSLATIONS
  ══════════════════════════════════════════════════════════ */
  var T = {
    /* ────────────────────── ARABIC ────────────────────── */
    ar: {
      /* Sidebar */
      sidebar_sub:        'نظام تتبع الأدوية',
      nav_dashboard:      'لوحة التحكم',
      nav_add_drug:       'إضافة دواء',
      nav_transfer:       'نقل دواء',
      nav_blockchain:     'Blockchain',
      nav_verify:         'التحقق من دواء',
      nav_tamper:         'كشف التلاعب',
      nav_audit:          'سجل العمليات',
      nav_ai_section:     'الذكاء الاصطناعي',
      nav_risk:           'محلل المخاطر AI',
      nav_advisor:        'تحليلات الأداء AI',
      btn_logout:         '🚪 تسجيل خروج',

      /* Common Buttons */
      btn_refresh:        '🔄 تحديث',
      btn_save:           'حفظ',
      btn_cancel:         'إلغاء',
      btn_verify:         'تحقق',
      btn_inspect:        'فحص',
      btn_delete:         'حذف',
      btn_export_csv:     '⬇ تصدير CSV',
      btn_add_drug_hdr:   '+ إضافة دواء',

      /* Common Table Headers */
      th_id:              '#',
      th_drug_name:       'اسم الدواء',
      th_batch_hash:      'Hash الدفعة',
      th_expiry:          'تاريخ الانتهاء',
      th_manufacturer:    'الشركة المصنعة',
      th_quantity:        'الكمية',
      th_status:          'الحالة',
      th_actions:         'الإجراءات',
      th_username:        'المستخدم',
      th_action:          'العملية',
      th_details:         'التفاصيل',
      th_datetime:        'التاريخ والوقت',
      th_ip:              'IP',

      /* Status */
      status_valid:       'صالح ✅',
      status_expired:     'منتهي ❌',
      status_soon:        'ينتهي قريباً ⚠️',

      /* Filter Bar */
      filter_all_status:  'كل الحالات',
      filter_valid:       'صالح ✅',
      filter_soon:        'ينتهي قريباً ⚠️',
      filter_expired:     'منتهي ❌',
      filter_all_mfr:     'كل الشركات',
      filter_all_qty:     'كل الكميات',
      filter_low_qty:     'كمية منخفضة ≤10',
      filter_ok_qty:      'كمية كافية >10',
      search_ph:          'ابحث بالاسم أو الشركة أو الرقم...',

      /* Pagination */
      page_showing:       'عرض',
      page_of:            'من',
      per_page_10:        '10 لكل صفحة',
      per_page_25:        '25 لكل صفحة',
      per_page_50:        '50 لكل صفحة',
      per_page_100:       '100 لكل صفحة',

      /* Loading / Empty */
      loading:            'جاري تحميل البيانات...',
      loading_log:        'جاري تحميل السجل...',
      empty_title:        'لا توجد نتائج مطابقة',
      empty_sub:          'جرب تعديل معايير البحث',

      /* ── Dashboard ── */
      dash_title:         'لوحة التحكم',
      dash_subtitle:      'نظرة عامة على المخزون وحالة الأدوية',
      dash_total:         'إجمالي الأدوية',
      dash_expired:       'منتهية الصلاحية',
      dash_soon:          'تنتهي خلال 30 يوم',
      dash_low_stock:     'كمية منخفضة',
      dash_card_title:    'الأدوية المسجلة',
      dash_card_sub:      'قاعدة بيانات المخزون الدوائي',
      dash_click_full:    'اضغط للعرض الكامل',
      dash_click_filter:  'اضغط للفلترة',
      dash_under_10:      'أقل من 10 وحدات',

      /* ── Add Drug ── */
      add_title:          'إضافة دواء جديد',
      add_subtitle:       'أدخل بيانات الدواء — سيتم تسجيله في Blockchain تلقائياً',
      add_card_basic:     'معلومات الدواء الأساسية',
      add_card_basic_sub: 'الاسم التجاري والتصنيف',
      add_card_prod:      'بيانات الإنتاج والتتبع',
      add_card_prod_sub:  'رقم الدفعة والشركة المصنعة',
      add_card_qty:       'الصلاحية والكمية',
      add_card_qty_sub:   'تواريخ الإنتاج والانتهاء وعدد الوحدات',
      add_card_progress:  'تقدم الإدخال',
      add_card_prog_sub:  'الحقول المطلوبة',
      add_card_tips:      'نصائح مهمة',
      add_btn:            '➕ إضافة الدواء وتسجيله في النظام',
      add_reset:          '🔄 مسح الحقول',

      /* ── Transfer ── */
      transfer_title:     'نقل دواء',
      transfer_subtitle:  'كل عملية نقل تُسجَّل في Blockchain — لا يمكن التلاعب بها',
      transfer_select:    'اختيار الدواء',
      transfer_select_sub:'اختر الدواء المراد نقله',
      transfer_details:   'تفاصيل النقل',
      transfer_details_sub:'المستلم والمسار',
      transfer_btn:       '🔄 نقل الدواء وتسجيله في الـ Blockchain',
      transfer_supply:    'مسار التوريد',
      transfer_supply_sub:'دورك الحالي في السلسلة',
      transfer_recent:    'آخر النقلات',
      transfer_recent_sub:'نقلاتك الأخيرة',

      /* ── Blockchain ── */
      chain_title:        'سجل Blockchain',
      chain_subtitle:     'السجل اللامركزي المشفر — غير قابل للتعديل',
      chain_card_title:   'كتل Blockchain',
      chain_card_sub:     'كل كتلة مرتبطة بالسابقة بـ Hash مشفر',

      /* ── Verify ── */
      verify_title:       'التحقق من دواء',
      verify_subtitle:    'أدخل رقم الدواء أو امسح الـ QR للتحقق من أصالته',
      verify_placeholder: 'أدخل رقم الدواء...',
      verify_btn:         '🔍 تحقق الآن',

      /* ── Audit ── */
      audit_title:        'سجل العمليات',
      audit_subtitle:     'Audit Log — جميع العمليات الأمنية والإدارية مسجلة هنا',
      audit_card_title:   'جميع العمليات',
      audit_card_sub:     'مرتبة من الأحدث للأقدم',
      audit_total:        'إجمالي العمليات',
      audit_logins:       'دخول ناجح',
      audit_failed:       'دخول فاشل',
      audit_tamper:       'تلاعب مكتشف',
      audit_added:        'أدوية مضافة',
      audit_transfers:    'عمليات نقل',
      audit_filter_all:   'كل العمليات',
      audit_login:        'دخول ناجح',
      audit_fail_login:   'دخول فاشل',
      audit_register:     'تسجيل حساب',
      audit_add_drug:     'إضافة دواء',
      audit_del_drug:     'حذف دواء',
      audit_transfer:     'نقل دواء',
      audit_tamper_f:     'تلاعب مكتشف 🚨',

      /* ── Attack Demo ── */
      attack_title:       'كشف التلاعب',
      attack_subtitle:    'محاكاة هجمات التلاعب وفحص سلامة Blockchain',

      /* ── Risk Analyst ── */
      risk_title:         'محلل المخاطر AI',
      risk_subtitle:      'تحليل ذكي لمخاطر سلسلة التوريد',

      /* ── Supply Advisor ── */
      advisor_title:      'تحليلات الأداء AI',
      advisor_subtitle:   'رؤى وتوصيات ذكية لتحسين المخزون',

      /* ── Login ── */
      login_subtitle:     'نظام تتبع الأدوية الآمن',
      login_username:     'اسم المستخدم',
      login_password:     'كلمة المرور',
      login_btn:          'دخول إلى النظام',
      login_pwd_hint:     'يجب أن تحتوي على 8 أحرف + رقم + حرف كبير',
      login_security:     'محمي بتشفير JWT + BCrypt · Blockchain Protection',
      login_username_ph:  'أدخل اسم المستخدم',
      login_password_ph:  'أدخل كلمة المرور',

      /* ── Drug Info ── */
      di_title:           'معلومات الدواء',
      di_sub:             'اعرف أكثر عن دوائك — بلغة سهلة وواضحة',
      di_ai_tag:          'مدعوم بالذكاء الاصطناعي',
      di_search_hdr:      '🔍 ابحث عن دواء',
      di_name_label:      'اسم الدواء (عربي أو إنجليزي)',
      di_name_ph:         'مثال: Paracetamol / باراسيتامول',
      di_level_label:     'مستوى المعلومات',
      di_popular:         'أدوية شائعة — اضغط للبحث مباشرة',
      di_lvl_patient:     '👤 للمريض',
      di_lvl_pharmacist:  '🏥 للصيدلاني',
      di_lvl_medical:     '🩺 طبي تفصيلي',
      di_btn:             '🔬 ابحث عن الدواء',
      di_back:            '← العودة للخلف',
      di_new_search:      '🔍 البحث عن دواء آخر',
      di_disclaimer:      '⚠️ هذه المعلومات للتثقيف الصحي فقط — استشر طبيبك أو صيدلانيك دائماً قبل استخدام أي دواء',
      di_loading:         'جاري البحث عن معلومات الدواء...',

      /* ── Patient Chat ── */
      pc_title:           'مساعد المريض الذكي',
      pc_sub:             'اسأل عن دوائك بالعربي — إجابات فورية وواضحة',
      pc_ai_tag:          'متصل — مدعوم بالذكاء الاصطناعي',
      pc_lookup_hdr:      '🔍 ابحث عن دوائك أولاً (اختياري)',
      pc_lookup_ph:       'رقم الدواء (ID) من الملصق أو QR',
      pc_lookup_btn:      'تحقق',
      pc_msg_ph:          'اكتب سؤالك هنا... (مثال: هل دوائي أصلي؟)',
      pc_send:            'إرسال',
      pc_bot_name:        'مساعد PharmaChain',
      pc_bot_status:      '● متصل الآن',
      pc_back:            '← العودة للخلف',
      pc_welcome:         'أهلاً! أنا مساعدك لمعلومات الدواء. يمكنك البحث عن رقم دوائك أعلاه للحصول على إجابات مخصصة، أو اكتب سؤالك مباشرة.',

      /* ── Dashboard extras ── */
      ledger_banner_title: 'وضع Ledger Admin — محايد تقنياً',
      ledger_banner_body:  'صلاحياتك مقتصرة على مراقبة سلسلة Blockchain والتحقق من سلامتها. لا تملك صلاحية إضافة أدوية أو نقلها أو حذفها.',
      tamper_alert:        'تحذير أمني: ',
    },

    /* ────────────────────── ENGLISH ────────────────────── */
    en: {
      /* Sidebar */
      sidebar_sub:        'Drug Tracking System',
      nav_dashboard:      'Dashboard',
      nav_add_drug:       'Add Drug',
      nav_transfer:       'Transfer Drug',
      nav_blockchain:     'Blockchain',
      nav_verify:         'Verify Drug',
      nav_tamper:         'Tamper Detection',
      nav_audit:          'Audit Log',
      nav_ai_section:     'Artificial Intelligence',
      nav_risk:           'AI Risk Analyst',
      nav_advisor:        'AI Performance Analytics',
      btn_logout:         '🚪 Logout',

      /* Common Buttons */
      btn_refresh:        '🔄 Refresh',
      btn_save:           'Save',
      btn_cancel:         'Cancel',
      btn_verify:         'Verify',
      btn_inspect:        'Inspect',
      btn_delete:         'Delete',
      btn_export_csv:     '⬇ Export CSV',
      btn_add_drug_hdr:   '+ Add Drug',

      /* Common Table Headers */
      th_id:              '#',
      th_drug_name:       'Drug Name',
      th_batch_hash:      'Batch Hash',
      th_expiry:          'Expiry Date',
      th_manufacturer:    'Manufacturer',
      th_quantity:        'Quantity',
      th_status:          'Status',
      th_actions:         'Actions',
      th_username:        'User',
      th_action:          'Action',
      th_details:         'Details',
      th_datetime:        'Date & Time',
      th_ip:              'IP',

      /* Status */
      status_valid:       'Valid ✅',
      status_expired:     'Expired ❌',
      status_soon:        'Expiring Soon ⚠️',

      /* Filter Bar */
      filter_all_status:  'All Statuses',
      filter_valid:       'Valid ✅',
      filter_soon:        'Expiring Soon ⚠️',
      filter_expired:     'Expired ❌',
      filter_all_mfr:     'All Manufacturers',
      filter_all_qty:     'All Quantities',
      filter_low_qty:     'Low Stock ≤10',
      filter_ok_qty:      'Sufficient >10',
      search_ph:          'Search by name, manufacturer or ID...',

      /* Pagination */
      page_showing:       'Showing',
      page_of:            'of',
      per_page_10:        '10 per page',
      per_page_25:        '25 per page',
      per_page_50:        '50 per page',
      per_page_100:       '100 per page',

      /* Loading / Empty */
      loading:            'Loading data...',
      loading_log:        'Loading log...',
      empty_title:        'No matching results',
      empty_sub:          'Try adjusting your search criteria',

      /* ── Dashboard ── */
      dash_title:         'Dashboard',
      dash_subtitle:      'Inventory overview and drug status',
      dash_total:         'Total Drugs',
      dash_expired:       'Expired',
      dash_soon:          'Expiring in 30 days',
      dash_low_stock:     'Low Stock',
      dash_card_title:    'Registered Drugs',
      dash_card_sub:      'Drug inventory database',
      dash_click_full:    'Click to view all',
      dash_click_filter:  'Click to filter',
      dash_under_10:      'Less than 10 units',

      /* ── Add Drug ── */
      add_title:          'Add New Drug',
      add_subtitle:       'Enter drug data — will be registered on Blockchain automatically',
      add_card_basic:     'Basic Drug Information',
      add_card_basic_sub: 'Trade name and classification',
      add_card_prod:      'Production & Tracking Data',
      add_card_prod_sub:  'Batch number and manufacturer',
      add_card_qty:       'Validity & Quantity',
      add_card_qty_sub:   'Production/expiry dates and unit count',
      add_card_progress:  'Input Progress',
      add_card_prog_sub:  'Required fields',
      add_card_tips:      'Important Tips',
      add_btn:            '➕ Add Drug & Register in System',
      add_reset:          '🔄 Clear Fields',

      /* ── Transfer ── */
      transfer_title:     'Transfer Drug',
      transfer_subtitle:  'Every transfer is recorded on Blockchain — tamper-proof',
      transfer_select:    'Select Drug',
      transfer_select_sub:'Choose the drug to transfer',
      transfer_details:   'Transfer Details',
      transfer_details_sub:'Recipient and route',
      transfer_btn:       '🔄 Transfer Drug & Record on Blockchain',
      transfer_supply:    'Supply Chain Route',
      transfer_supply_sub:'Your current position in the chain',
      transfer_recent:    'Recent Transfers',
      transfer_recent_sub:'Your latest transfers',

      /* ── Blockchain ── */
      chain_title:        'Blockchain Ledger',
      chain_subtitle:     'Decentralized encrypted ledger — immutable',
      chain_card_title:   'Blockchain Blocks',
      chain_card_sub:     'Each block is cryptographically linked to the previous',

      /* ── Verify ── */
      verify_title:       'Verify Drug',
      verify_subtitle:    'Enter drug ID or scan QR to verify authenticity',
      verify_placeholder: 'Enter drug ID...',
      verify_btn:         '🔍 Verify Now',

      /* ── Audit ── */
      audit_title:        'Audit Log',
      audit_subtitle:     'All security and administrative operations are recorded here',
      audit_card_title:   'All Operations',
      audit_card_sub:     'Sorted from newest to oldest',
      audit_total:        'Total Operations',
      audit_logins:       'Successful Logins',
      audit_failed:       'Failed Logins',
      audit_tamper:       'Tampering Detected',
      audit_added:        'Drugs Added',
      audit_transfers:    'Transfers',
      audit_filter_all:   'All Operations',
      audit_login:        'Successful Login',
      audit_fail_login:   'Failed Login',
      audit_register:     'Account Registration',
      audit_add_drug:     'Add Drug',
      audit_del_drug:     'Delete Drug',
      audit_transfer:     'Transfer Drug',
      audit_tamper_f:     'Tampering Detected 🚨',

      /* ── Attack Demo ── */
      attack_title:       'Tamper Detection',
      attack_subtitle:    'Simulate attacks and verify Blockchain integrity',

      /* ── Risk Analyst ── */
      risk_title:         'AI Risk Analyst',
      risk_subtitle:      'AI-powered supply chain risk analysis',

      /* ── Supply Advisor ── */
      advisor_title:      'AI Performance Analytics',
      advisor_subtitle:   'Smart insights and recommendations for inventory optimization',

      /* ── Login ── */
      login_subtitle:     'Secure Drug Tracking System',
      login_username:     'Username',
      login_password:     'Password',
      login_btn:          'Sign In',
      login_pwd_hint:     'Must contain 8+ chars, a number and uppercase letter',
      login_security:     'Secured with JWT + BCrypt · Blockchain Protection',
      login_username_ph:  'Enter your username',
      login_password_ph:  'Enter your password',

      /* ── Drug Info ── */
      di_title:           'Drug Information',
      di_sub:             'Learn more about your medication — clearly explained',
      di_ai_tag:          'Powered by AI',
      di_search_hdr:      '🔍 Search for a Drug',
      di_name_label:      'Drug name (Arabic or English)',
      di_name_ph:         'e.g. Paracetamol / Amoxicillin',
      di_level_label:     'Information level',
      di_popular:         'Common drugs — click to search instantly',
      di_lvl_patient:     '👤 Patient',
      di_lvl_pharmacist:  '🏥 Pharmacist',
      di_lvl_medical:     '🩺 Medical Detailed',
      di_btn:             '🔬 Search Drug',
      di_back:            '← Go Back',
      di_new_search:      '🔍 Search Another Drug',
      di_disclaimer:      '⚠️ For health education only — always consult your doctor or pharmacist before using any medication',
      di_loading:         'Searching for drug information...',

      /* ── Patient Chat ── */
      pc_title:           'Smart Patient Assistant',
      pc_sub:             'Ask about your medication — instant clear answers',
      pc_ai_tag:          'Connected — Powered by AI',
      pc_lookup_hdr:      '🔍 Look up your drug first (optional)',
      pc_lookup_ph:       'Drug ID from label or QR code',
      pc_lookup_btn:      'Look Up',
      pc_msg_ph:          'Type your question... (e.g. Is my drug authentic?)',
      pc_send:            'Send',
      pc_bot_name:        'PharmaChain Assistant',
      pc_bot_status:      '● Online Now',
      pc_back:            '← Go Back',
      pc_welcome:         'Hello! I\'m your medication assistant. Search for your drug ID above for personalized answers, or type your question directly.',

      /* ── Dashboard extras ── */
      ledger_banner_title: 'Ledger Admin Mode — Technically Neutral',
      ledger_banner_body:  'Your permissions are limited to monitoring the Blockchain and verifying its integrity. You cannot add, transfer, or delete drugs.',
      tamper_alert:        'Security Alert: ',
    }
  };

  /* ══════════════════════════════════════════════════════════
     ENGINE
  ══════════════════════════════════════════════════════════ */
  var _lang = localStorage.getItem('pharmaLang') || 'ar';

  function apply(lang) {
    _lang = lang;
    localStorage.setItem('pharmaLang', lang);

    /* Direction + lang attr */
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';

    var map = T[lang] || {};

    /* Text content */
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (map[key] !== undefined) el.textContent = map[key];
    });

    /* Placeholders */
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-ph');
      if (map[key] !== undefined) el.placeholder = map[key];
    });

    /* Update toggle button text (both sidebar and floating) */
    document.querySelectorAll('.lang-toggle-btn, .lang-toggle-float').forEach(function(btn) {
      btn.textContent = lang === 'ar' ? '🇬🇧 EN' : '🇸🇦 AR';
    });

    /* Fire event so pages can re-render dynamic content */
    window.dispatchEvent(new Event('pharmaLangChanged'));
  }

  /* ── Public API ── */
  window.PharmaLang = {
    init:   function () { apply(_lang); },
    toggle: function () { apply(_lang === 'ar' ? 'en' : 'ar'); },
    get:    function () { return _lang; },
    t:      function (key) { return (T[_lang] || {})[key] || key; }
  };

  /* Auto-apply on DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(_lang); });
  } else {
    apply(_lang);
  }
})();
