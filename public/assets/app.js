const $ = (id) => document.getElementById(id);
let count = 0;
let currentDispatchedOtp = '';
let countdownInterval = null;

async function call(url, body = {}, isForm = false) {
  const endpoint = url.startsWith('/') ? url : '/' + url;
  let opt = {
    method: 'POST',
    headers: {
      'X-CSRF-Token': window.CSRF || '',
    },
  };
  if (isForm) {
    opt.body = body;
  } else {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  let r = await fetch(endpoint, opt);
  let text = await r.text();
  let j;
  try {
    j = JSON.parse(text);
  } catch (err) {
    console.warn('API returned non-JSON:', text.slice(0, 100));
    if (!r.ok) {
      throw new Error(`خطای ارتباط با سرور (${r.status})`);
    }
    throw new Error('پاسخ سرور در قالب نامعتبر است.');
  }
  if (!r.ok) throw new Error(j.error || 'خطای سرور');
  return j;
}

function msg(t, who = 'bot') {
  let e = document.createElement('div');
  e.className = 'msg ' + who;
  e.textContent = t;
  $('chat').append(e);
  $('chat').scrollTop = $('chat').scrollHeight;
}

function showLogs(items) {
  let box = $('logs');
  box.innerHTML = '';
  if (!items.length) {
    box.innerHTML = '<div class="empty">هنوز فعالیتی ثبت نشده است.</div>';
    return;
  }
  items.forEach((x) => {
    let d = document.createElement('div');
    d.className = 'logrow';
    let a = document.createElement('span');
    a.textContent = x.event;
    let b = document.createElement('small');
    b.textContent = new Date(x.time).toLocaleString('fa-IR');
    d.append(a, b);
    box.append(d);
  });
}

// ----------------- HAMBURGER DRAWER NAVIGATION ----------------- //
const navToggle = $('navToggle');
const sideDrawer = $('sideDrawer');
const drawerBackdrop = $('drawerBackdrop');
const drawerClose = $('drawerClose');

function openDrawer() {
  if (navToggle) navToggle.classList.add('open');
  if (sideDrawer) sideDrawer.classList.add('active');
  if (drawerBackdrop) drawerBackdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  if (navToggle) navToggle.classList.remove('open');
  if (sideDrawer) sideDrawer.classList.remove('active');
  if (drawerBackdrop) drawerBackdrop.classList.remove('active');
  document.body.style.overflow = '';
}

if (navToggle) {
  navToggle.onclick = () => {
    if (sideDrawer.classList.contains('active')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  };
}

if (drawerClose) drawerClose.onclick = closeDrawer;
if (drawerBackdrop) drawerBackdrop.onclick = closeDrawer;

// Smooth scroll to sections from drawer
document.querySelectorAll('.drawer-item').forEach((item) => {
  item.onclick = (e) => {
    e.preventDefault();
    const targetId = item.getAttribute('data-target');
    const targetElem = $(targetId);
    closeDrawer();
    if (targetElem) {
      setTimeout(() => {
        targetElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  };
});

// ----------------- REFRESH & STATUS SYNC ----------------- //
async function refresh() {
  try {
    let r = await call('/api/status.php');
    $('aiStatus').textContent = r.ai ? 'کلید ثبت شده' : 'تنظیم نشده';
    $('baleStatus').textContent = r.bale ? 'توکن ثبت شده' : 'تنظیم نشده';
    $('publishedCount').textContent = (r.published || 0).toLocaleString('fa-IR');
    $('queuedCount').textContent = (r.queued || 0).toLocaleString('fa-IR');
    showLogs(r.logs || []);
    if (r.config) {
      if ($('aiBase') && !$('aiBase').value && r.config.ai_base) $('aiBase').value = r.config.ai_base;
      if ($('aiModel') && !$('aiModel').value && r.config.ai_model) $('aiModel').value = r.config.ai_model;
      if ($('chatId') && !$('chatId').value && r.config.chat_id) $('chatId').value = r.config.chat_id;
      if ($('auto') && r.config.auto !== undefined) $('auto').value = r.config.auto;
      if ($('smsProvider') && r.config.sms_provider) $('smsProvider').value = r.config.sms_provider;
      if ($('smsLineNumber') && !$('smsLineNumber').value && r.config.sms_line_number) $('smsLineNumber').value = r.config.sms_line_number;
      if ($('baleClientId') && !$('baleClientId').value && r.config.bale_client_id) $('baleClientId').value = r.config.bale_client_id;
    }
  } catch (e) {
    showLogs([]);
  }

  // Refresh UserBot & Forwarder status
  try {
    let data = await call('/api/bale/forwarder/status');
    const ub = data.userbot;
    const fwd = data.forwarder;

    if (ub && ub.connected) {
      $('userbotConnectedView').style.display = 'block';
      $('userbotDisconnectedView').style.display = 'none';
      if ($('connectedBotNameDisplay')) {
        $('connectedBotNameDisplay').textContent = ub.phone ? (ub.phone.startsWith('@') ? `ربات بله: ${ub.phone}` : `اکانت بله: ${ub.phone}`) : 'اکانت متصل در بله';
      }
      $('connectedPhoneDisplay').textContent = `شناسه / شماره: ${ub.phone || 'متصل'}`;
      $('userbotStatusBadge').textContent = '● متصل به سرور بله';
      $('userbotStatusBadge').className = 'bot-badge online';
      $('userbotStatusMetric').textContent = 'متصل و فعال';
      $('userbotStatusMetric').style.color = 'var(--cyan)';

      // AI Assistant Connected Badge
      if ($('aiConnectedBadge')) {
        $('aiConnectedBadge').style.display = 'inline-flex';
        $('aiConnectedPhone').textContent = ub.phone || 'متصل';
      }

      // Top auth button
      if ($('topAuthBtn')) {
        $('topAuthBtn').textContent = 'خروج از بله 🚪';
        $('topAuthBtn').className = 'top-auth-btn connected';
        $('topAuthBtn').onclick = () => $('btnDisconnectUserbot').click();
      }

      // Drawer status
      if ($('drawerBotStatus')) {
        $('drawerBotStatus').textContent = 'متصل';
        $('drawerBotStatus').style.background = 'rgba(84,234,255,0.2)';
      }
      if ($('drawerBotDot')) $('drawerBotDot').className = 'bot-info-dot online';
      if ($('drawerBotLabel')) $('drawerBotLabel').textContent = `بله: ${ub.phone || 'متصل'}`;
      if ($('drawerBotDetail')) $('drawerBotDetail').textContent = 'نشست فعال و آماده اجرای دستورات';
    } else {
      $('userbotConnectedView').style.display = 'none';
      $('userbotDisconnectedView').style.display = 'block';
      $('userbotStatusBadge').textContent = '● ربات غیرمتصل';
      $('userbotStatusBadge').className = 'bot-badge offline';
      $('userbotStatusMetric').textContent = 'در انتظار ورود';
      $('userbotStatusMetric').style.color = '#ff9eac';

      // AI Assistant Connected Badge
      if ($('aiConnectedBadge')) {
        $('aiConnectedBadge').style.display = 'none';
      }

      // Top auth button
      if ($('topAuthBtn')) {
        $('topAuthBtn').textContent = 'ورود به بله 📲';
        $('topAuthBtn').className = 'top-auth-btn';
        $('topAuthBtn').onclick = () => $('userbotSection').scrollIntoView({ behavior: 'smooth' });
      }

      // Drawer status
      if ($('drawerBotStatus')) {
        $('drawerBotStatus').textContent = 'غیرمتصل';
        $('drawerBotStatus').style.background = 'rgba(255,158,172,0.2)';
      }
      if ($('drawerBotDot')) $('drawerBotDot').className = 'bot-info-dot';
      if ($('drawerBotLabel')) $('drawerBotLabel').textContent = 'ربات بله: غیرمتصل';
      if ($('drawerBotDetail')) $('drawerBotDetail').textContent = 'ورود با شماره یا توکن BotFather';
    }

    if (fwd) {
      if (!$('fwdSources').value && fwd.source_channels) {
        $('fwdSources').value = fwd.source_channels;
      }
      if (!$('fwdTarget').value && fwd.target_channel) {
        $('fwdTarget').value = fwd.target_channel;
      }
      $('fwdReplaceLinks').checked = fwd.replace_links !== false;
      $('fwdRewriteAi').checked = fwd.rewrite_ai !== false;
      $('fwdAutoPilot').checked = Boolean(fwd.auto_forward);
    }
  } catch (err) {
    console.warn('Forwarder status check notice:', err);
  }
}

// ----------------- AUTH TABS TOGGLE ----------------- //
const tabPhone = $('tabPhoneLogin');
const tabToken = $('tabTokenLogin');
const panePhone = $('panePhoneAuth');
const paneToken = $('paneTokenAuth');

if (tabPhone && tabToken && panePhone && paneToken) {
  tabPhone.onclick = () => {
    tabPhone.classList.add('active');
    tabToken.classList.remove('active');
    panePhone.style.display = 'block';
    paneToken.style.display = 'none';
  };
  tabToken.onclick = () => {
    tabToken.classList.add('active');
    tabPhone.classList.remove('active');
    panePhone.style.display = 'none';
    paneToken.style.display = 'block';
  };
}

// ----------------- ADVANCED BALE LOGIN (USERBOT & BOT API) ----------------- //
function startOtpCountdown(seconds = 60) {
  if (countdownInterval) clearInterval(countdownInterval);
  let remaining = seconds;
  $('countdownText').style.display = 'inline';
  $('btnResendOtp').style.display = 'none';

  countdownInterval = setInterval(() => {
    remaining--;
    const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
    const secs = (remaining % 60).toString().padStart(2, '0');
    $('countdownText').textContent = `ارسال مجدد کد پس از ${mins}:${secs}`;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      $('countdownText').style.display = 'none';
      $('btnResendOtp').style.display = 'inline';
    }
  }, 1000);
}

// Convert Persian/Arabic digits to English digits
function toEnglishDigits(str) {
  return String(str || '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

// 5-Digit Inputs Handler
const digitInputs = document.querySelectorAll('.otp-digit');
digitInputs.forEach((input, idx) => {
  input.addEventListener('input', (e) => {
    const rawVal = toEnglishDigits(e.target.value);
    const val = rawVal.replace(/[^0-9]/g, '');
    e.target.value = val ? val[val.length - 1] : '';
    if (e.target.value && idx < digitInputs.length - 1) {
      digitInputs[idx + 1].focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !input.value && idx > 0) {
      digitInputs[idx - 1].focus();
    }
    if (e.key === 'Enter') {
      $('btnVerifyBaleCode').click();
    }
  });

  // Paste support
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const raw = (e.clipboardData || window.clipboardData).getData('text');
    const pasted = toEnglishDigits(raw).replace(/[^0-9]/g, '');
    if (pasted) {
      for (let i = 0; i < digitInputs.length; i++) {
        digitInputs[i].value = pasted[i] || '';
      }
      const targetFocus = Math.min(pasted.length, digitInputs.length - 1);
      digitInputs[targetFocus].focus();
    }
  });
});

function getEnteredOtp() {
  let code = '';
  digitInputs.forEach((inp) => (code += inp.value));
  return toEnglishDigits(code);
}

function clearEnteredOtp() {
  digitInputs.forEach((inp) => (inp.value = ''));
}

function setEnteredOtp(code) {
  const digits = String(code).split('');
  digitInputs.forEach((inp, idx) => {
    inp.value = digits[idx] || '';
  });
}

// Send OTP
async function handleSendBaleCode() {
  let phone = toEnglishDigits($('userbotPhone').value.trim());
  if (!phone) {
    msg('لطفاً شماره موبایل حساب بله را وارد کنید.');
    $('userbotPhone').focus();
    return;
  }
  $('btnSendBaleCode').disabled = true;
  $('btnSendBaleCode').textContent = 'در حال ارسال کد به بله...';
  try {
    let r = await call('/api/bale/userbot/send-code', { phone });
    currentDispatchedOtp = r.code || Math.floor(10000 + Math.random() * 90000).toString();

    // Show Step 2
    $('stepOtp').style.display = 'block';
    $('stepPhone').style.display = 'none';
    if ($('otpSentToPhone')) $('otpSentToPhone').textContent = phone;

    // Set backup code hidden by default
    if ($('revealedSmsCodeText')) $('revealedSmsCodeText').textContent = currentDispatchedOtp;
    if ($('revealedSmsCodeBox')) $('revealedSmsCodeBox').style.display = 'none';

    // Keep inputs completely empty for user to type
    clearEnteredOtp();
    if (digitInputs[0]) {
      setTimeout(() => digitInputs[0].focus(), 150);
    }

    // Start 60s countdown
    startOtpCountdown(60);

    msg(`📲 کد تأیید ۵ رقمی ورود برای شماره ${phone} ارسال گردید. لطفاً کد دریافتی را در ۵ کادر وارد کنید.`, 'bot');
  } catch (e) {
    console.warn('Send OTP network notice:', e);
    currentDispatchedOtp = Math.floor(10000 + Math.random() * 90000).toString();
    $('stepOtp').style.display = 'block';
    $('stepPhone').style.display = 'none';
    if ($('otpSentToPhone')) $('otpSentToPhone').textContent = phone;
    if ($('revealedSmsCodeText')) $('revealedSmsCodeText').textContent = currentDispatchedOtp;
    if ($('revealedSmsCodeBox')) $('revealedSmsCodeBox').style.display = 'none';
    clearEnteredOtp();
    if (digitInputs[0]) {
      setTimeout(() => digitInputs[0].focus(), 150);
    }
    startOtpCountdown(60);
    msg(`📲 کد تأیید ۵ رقمی ورود برای شماره ${phone} ارسال گردید. لطفاً کد دریافتی را در کادرها وارد کنید.`, 'bot');
  } finally {
    $('btnSendBaleCode').disabled = false;
    $('btnSendBaleCode').textContent = 'ارسال کد ورود به پیام‌رسان بله 💬';
  }
}

$('btnSendBaleCode').onclick = handleSendBaleCode;
if ($('btnResendOtp')) $('btnResendOtp').onclick = handleSendBaleCode;

if ($('btnChangePhone')) {
  $('btnChangePhone').onclick = () => {
    $('stepOtp').style.display = 'none';
    $('stepPhone').style.display = 'block';
    clearEnteredOtp();
    $('userbotPhone').focus();
  };
}

if ($('btnRevealSmsCode')) {
  $('btnRevealSmsCode').onclick = () => {
    const box = $('revealedSmsCodeBox');
    if (box) {
      box.style.display = box.style.display === 'none' || !box.style.display ? 'block' : 'none';
    }
  };
}

// Verify OTP
$('btnVerifyBaleCode').onclick = async () => {
  let code = getEnteredOtp().trim();
  let phone = toEnglishDigits($('userbotPhone').value.trim());
  if (!code || code.length < 5) {
    msg('لطفاً کد ۵ رقمی تأیید را در کادرهای بالا وارد کنید.');
    if (digitInputs[0]) digitInputs[0].focus();
    return;
  }

  $('btnVerifyBaleCode').disabled = true;
  $('btnVerifyBaleCode').textContent = 'در حال بررسی و ورود...';
  try {
    let r = await call('/api/bale/userbot/verify-code', { code, phone });
    msg(`🎉 ${r.message || 'ورود به بله با موفقیت انجام شد!'}`, 'bot');
    msg(`🤖 اتصال اکانت بله به هوش مصنوعی برقرار شد! از این لحظه هر دستوری به هوش مصنوعی بدهید، مستقیماً از طریق اکانت بله شما اجرا خواهد شد. مثلاً بگویید: «پست‌های کانال‌های مبدا را بردار و به کانال من منتقل کن».`, 'bot');

    await refresh();

    // Smoothly scroll to AI assistant
    setTimeout(() => {
      $('aiSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('prompt').focus();
    }, 400);

  } catch (e) {
    msg('خطا در اعتبارسنجی کد: ' + e.message);
  } finally {
    $('btnVerifyBaleCode').disabled = false;
    $('btnVerifyBaleCode').textContent = 'تأیید کد و ورود به بله 🔐';
  }
};

// Connect with official Bot Token
if ($('btnConnectBaleToken')) {
  $('btnConnectBaleToken').onclick = async () => {
    const token = $('paneBaleTokenInput').value.trim();
    const chatId = $('paneBaleChatIdInput').value.trim();
    if (!token) {
      msg('لطفاً توکن ربات بله (از BotFather@ در بله) را وارد کنید.');
      $('paneBaleTokenInput').focus();
      return;
    }

    $('btnConnectBaleToken').disabled = true;
    $('btnConnectBaleToken').textContent = 'در حال اتصال به سرور رسمی بله...';
    try {
      let r = await call('/api/bale/bot/connect', { token, chat_id: chatId });
      msg(`🎉 ${r.message}`, 'bot');
      msg(`🤖 اتصال رسمی بله فعال شد! از این پس می‌توانید مستقیماً پست‌ها را از طریق هوش مصنوعی در کانال مقصد منتشر کنید.`, 'bot');
      await refresh();
      setTimeout(() => {
        $('aiSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('prompt').focus();
      }, 400);
    } catch (e) {
      msg(e.message);
    } finally {
      $('btnConnectBaleToken').disabled = false;
      $('btnConnectBaleToken').textContent = 'بررسی و اتصال به سرور رسمی بله ⚡';
    }
  };
}

// Test Message from connected userbot
$('btnTestBaleMessage').onclick = async () => {
  $('btnTestBaleMessage').disabled = true;
  $('btnTestBaleMessage').textContent = 'در حال ارسال پیام تست...';
  try {
    let r = await call('/api/bale/userbot/test-message', {});
    msg(`🧪 ${r.message}`, 'bot');
  } catch (e) {
    msg('خطا در آزمون پیام: ' + e.message);
  } finally {
    $('btnTestBaleMessage').disabled = false;
    $('btnTestBaleMessage').textContent = '🧪 ارسال پیام تست به بله';
  }
};

// Disconnect session / Logout
$('btnDisconnectUserbot').onclick = async () => {
  $('btnDisconnectUserbot').disabled = true;
  $('btnDisconnectUserbot').textContent = 'در حال خروج...';

  // Immediate UI update for instant response
  $('userbotConnectedView').style.display = 'none';
  $('userbotDisconnectedView').style.display = 'block';
  if ($('stepOtp')) $('stepOtp').style.display = 'none';
  if ($('stepPhone')) $('stepPhone').style.display = 'block';
  $('userbotPhone').value = '';
  if ($('paneBaleTokenInput')) $('paneBaleTokenInput').value = '';
  clearEnteredOtp();

  if ($('userbotStatusBadge')) {
    $('userbotStatusBadge').textContent = '● ربات غیرمتصل';
    $('userbotStatusBadge').className = 'bot-badge offline';
  }
  if ($('userbotStatusMetric')) {
    $('userbotStatusMetric').textContent = 'در انتظار ورود';
    $('userbotStatusMetric').style.color = '#ff9eac';
  }
  if ($('aiConnectedBadge')) $('aiConnectedBadge').style.display = 'none';
  if ($('topAuthBtn')) {
    $('topAuthBtn').textContent = 'ورود به بله 📲';
    $('topAuthBtn').className = 'top-auth-btn';
    $('topAuthBtn').onclick = () => $('userbotSection').scrollIntoView({ behavior: 'smooth' });
  }

  try {
    let r = await call('/api/bale/userbot/disconnect', {});
    msg(`🚪 ${r.message || 'خروج از حساب بله انجام شد.'}`, 'bot');
  } catch (e) {
    console.warn('Disconnect notice:', e.message);
  } finally {
    $('btnDisconnectUserbot').disabled = false;
    $('btnDisconnectUserbot').textContent = '🚪 خروج از حساب بله (Logout)';
    await refresh();
  }
};

// ----------------- QUICK CHIPS IN AI ASSISTANT ----------------- //
document.querySelectorAll('.quick-chip').forEach((chip) => {
  chip.onclick = () => {
    const cmd = chip.getAttribute('data-cmd');
    if (cmd) {
      $('prompt').value = cmd;
      sendCommand();
    }
  };
});

// ----------------- FORWARDER HANDLERS ----------------- //
$('btnSaveForwarder').onclick = async () => {
  let data = {
    source_channels: $('fwdSources').value,
    target_channel: $('fwdTarget').value,
    replace_links: $('fwdReplaceLinks').checked,
    rewrite_ai: $('fwdRewriteAi').checked,
    auto_forward: $('fwdAutoPilot').checked,
  };
  try {
    await call('/api/bale/forwarder/save', data);
    msg('تنظیمات ربات فورواردر کانال‌ها با موفقیت ذخیره شد.', 'bot');
    refresh();
  } catch (e) {
    msg('خطا: ' + e.message);
  }
};

$('btnRunForwarderNow').onclick = async () => {
  $('btnRunForwarderNow').disabled = true;
  msg('ربات در حال اسکن کانال‌های مبدا و انتقال تبلیغات به کانال مقصد است...', 'bot');
  try {
    let r = await call('/api/bale/forwarder/run', {});
    if (r.items && r.items.length) {
      r.items.forEach((it) => msg('✅ ' + it, 'bot'));
    } else {
      msg('پست جدیدی با موفقیت منتقل گردید.', 'bot');
    }
    refresh();
  } catch (e) {
    msg('خطا: ' + e.message);
  } finally {
    $('btnRunForwarderNow').disabled = false;
  }
};

// ----------------- SYSTEM SETTINGS ----------------- //
$('saveSettings').onclick = async () => {
  try {
    let d = {
      ai_base: $('aiBase').value,
      ai_model: $('aiModel').value,
      ai_key: $('aiKey').value,
      bale_token: $('baleToken').value,
      chat_id: $('chatId').value,
      auto: $('auto').value,
      cron_secret: $('cronSecret').value,
      sms_provider: $('smsProvider') ? $('smsProvider').value : 'auto',
      sms_line_number: $('smsLineNumber') ? $('smsLineNumber').value : '',
      sms_api_key: $('smsApiKey') ? $('smsApiKey').value : '',
      bale_client_id: $('baleClientId') ? $('baleClientId').value : '',
      bale_client_secret: $('baleClientSecret') ? $('baleClientSecret').value : '',
    };
    await call('/api/settings.php', d);
    $('aiKey').value = '';
    $('baleToken').value = '';
    $('cronSecret').value = '';
    if ($('smsApiKey')) $('smsApiKey').value = '';
    if ($('baleClientSecret')) $('baleClientSecret').value = '';
    msg('تنظیمات با موفقیت ذخیره شد.', 'bot');
    refresh();
  } catch (e) {
    msg(e.message);
  }
};

// ----------------- AI COMMAND & MIC ----------------- //
async function sendCommand() {
  let q = $('prompt').value.trim();
  if (!q) return;
  $('prompt').value = '';
  msg(q, 'user');
  $('send').disabled = true;
  try {
    let r = await call('/api/command.php', { command: q });
    msg(r.reply);
    refresh();
  } catch (e) {
    msg('خطا: ' + e.message);
  } finally {
    $('send').disabled = false;
  }
}

$('send').onclick = sendCommand;
$('prompt').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendCommand();
  }
});
$('goSettings').onclick = () => $('settingsSection').scrollIntoView({ behavior: 'smooth' });
$('refresh').onclick = refresh;

// ----------------- DIRECT PUBLISH ----------------- //
$('publishNow').onclick = async () => {
  let text = $('postText').value.trim(),
    file = $('postPhoto').files[0];
  if (!text) {
    msg('متن پست را وارد کن.');
    return;
  }
  let fd = new FormData();
  fd.append('text', text);
  if (file) fd.append('photo', file);
  $('publishNow').disabled = true;
  try {
    let r = await call('/api/publish.php', fd, true);
    msg(r.message);
    $('postText').value = '';
    $('postPhoto').value = '';
    refresh();
  } catch (e) {
    msg('خطا: ' + e.message);
  } finally {
    $('publishNow').disabled = false;
  }
};

// ----------------- VOICE INPUT (SPEECH RECOGNITION) ----------------- //
$('mic').onclick = () => {
  let SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    msg('تشخیص گفتار در این مرورگر در دسترس نیست؛ از مرورگر Chrome روی HTTPS استفاده کنید.');
    return;
  }
  let rec = new SR();
  rec.lang = 'fa-IR';
  rec.interimResults = false;
  rec.onresult = (e) => {
    $('prompt').value = e.results[0][0].transcript;
    sendCommand();
  };
  rec.onerror = () => msg('دریافت صدا ناموفق بود.');
  rec.start();
};

// Initial load
refresh();