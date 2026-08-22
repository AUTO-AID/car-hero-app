#!/usr/bin/env node
// ============================================================
//  start-lan — يشغّل Expo بعنوان شبكة محلّية **صحيح** في الباركود
//
//  المطبّ الذي يحلّه: Expo يشتقّ عنوان الباركود من `lan-network` التي تسأل
//  نظام التشغيل عن بطاقة **المسار الافتراضي**. وحين يعمل VPN (ProtonVPN،
//  WARP، Tailscale…) يصير المسار الافتراضي ملكه بأولوية أعلى من الـWi-Fi،
//  فتُرجع عنوان النفق — أو تفشل فيسقط Expo على `127.0.0.1`.
//
//  وفي الحالتين الباركود يشير إلى عنوان **لا يوجد عند الهاتف**: `127.0.0.1`
//  عند الهاتف هو الهاتف نفسه، وعنوان النفق لا يصله من شبكة الواي-فاي. النتيجة
//  رسالة Expo Go المبهمة «Something went wrong» التي لا تُصلحها إعادة المحاولة
//  أبداً، لأن العنوان خطأ لا الاتصال.
//
//  الحلّ: نختار البطاقة الحقيقية بأنفسنا ونثبّتها في
//  `REACT_NATIVE_PACKAGER_HOSTNAME` — وهو المتغيّر الذي يتقدّم على كل اشتقاق
//  داخلي في Expo (انظر UrlCreator.getDefaultHostname).
//
//  الاستعمال:
//    node scripts/start-lan.cjs              # اكتشاف تلقائي
//    node scripts/start-lan.cjs --ip=1.2.3.4 # عنوان صريح
//    node scripts/start-lan.cjs --tunnel     # نفق: يعمل عبر أي شبكة
//    أي وسيط آخر يُمرَّر إلى `expo start` كما هو.
// ============================================================
'use strict';

const os = require('os');
const { spawn, execFileSync } = require('child_process');

/**
 * بطاقات افتراضية وأنفاق. لا نستبعدها بنطاق العنوان لأن ProtonVPN يوزّع
 * عناوين من 10.x تماماً كشبكة منزلية — الاسم وحده هو ما يفرّقهما.
 */
const VIRTUAL_ADAPTER =
  /(vpn|proton|wireguard|openvpn|tailscale|zerotier|warp|tunnel|\btun\d*\b|\btap\d*\b|\bwt\d+\b|hyper-?v|vethernet|wsl|virtualbox|vmware|docker|loopback|bluetooth|radmin|nordlynx)/i;

/** أسماء البطاقات الحقيقية — يُطابق الاسم العربي «شبكة Wi-Fi» أيضاً */
const PHYSICAL_ADAPTER = /(wi-?fi|wireless|wlan|ethernet|\ben\d|\beth\d|local area)/i;

/** 100.64.0.0/10 — نطاق CGNAT الذي تستعمله أنفاق مثل WARP وTailscale */
function isCarrierGradeNat(address) {
  const [a, b] = address.split('.').map(Number);
  return a === 100 && b >= 64 && b <= 127;
}

function isPrivate(address) {
  const [a, b] = address.split('.').map(Number);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/** كل عناوين IPv4 الخارجية مع اسم بطاقتها */
function candidates() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const addr of addrs || []) {
      // Node ≥18 يُرجع family كرقم أحياناً
      const isV4 = addr.family === 'IPv4' || addr.family === 4;
      if (!isV4 || addr.internal) continue;
      out.push({ name, address: addr.address });
    }
  }
  return out;
}

/**
 * عناوين البطاقات التي تملك **بوّابة حقيقية** في جدول التوجيه.
 *
 * على ويندوز، مسار VPN الافتراضي يُكتب `On-link` (بلا بوّابة) بينما الـWi-Fi
 * يُكتب ببوّابة الراوتر. هذا أدقّ تمييز متاح، لكنه يعتمد على تنسيق مخرجات
 * `route` — فيبقى مُرجِّحاً لا حاكماً، وأي فشل فيه لا يُعطّل الاكتشاف.
 */
function gatewayBackedAddresses() {
  if (process.platform !== 'win32') return [];
  try {
    const output = execFileSync('route', ['print', '-4'], {
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
    });
    const found = [];
    for (const line of output.split(/\r?\n/)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 5 || cols[0] !== '0.0.0.0' || cols[1] !== '0.0.0.0') continue;
      const [, , gateway, iface] = cols;
      if (!/^\d+\.\d+\.\d+\.\d+$/.test(gateway)) continue; // On-link ⇒ نفق
      if (/^\d+\.\d+\.\d+\.\d+$/.test(iface)) found.push(iface);
    }
    return found;
  } catch {
    return [];
  }
}

function detectLanIp() {
  const all = candidates();
  if (!all.length) return null;

  const usable = all.filter(
    (item) => !VIRTUAL_ADAPTER.test(item.name) && !isCarrierGradeNat(item.address),
  );
  const pool = usable.length ? usable : all;

  const gatewayed = gatewayBackedAddresses();
  const score = (item) =>
    (gatewayed.includes(item.address) ? 8 : 0) +
    (PHYSICAL_ADAPTER.test(item.name) ? 4 : 0) +
    (isPrivate(item.address) ? 2 : 0);

  return [...pool].sort((a, b) => score(b) - score(a))[0].address;
}

function main() {
  const argv = process.argv.slice(2);
  const explicit = argv.find((arg) => arg.startsWith('--ip='));
  const passthrough = argv.filter((arg) => !arg.startsWith('--ip='));
  const tunnel = passthrough.includes('--tunnel');

  const env = { ...process.env };

  if (tunnel) {
    // النفق يوجّه عبر خوادم Expo فلا معنى لتثبيت عنوان محلّي — وتركه مضبوطاً
    // يجعل Expo يخلط بين العنوانين.
    delete env.REACT_NATIVE_PACKAGER_HOSTNAME;
    console.log('› وضع النفق: الباركود يعمل عبر أي شبكة (أبطأ قليلاً).\n');
  } else {
    const ip = explicit ? explicit.slice('--ip='.length).trim() : env.REACT_NATIVE_PACKAGER_HOSTNAME || detectLanIp();

    if (!ip) {
      console.error('✘ تعذّر إيجاد عنوان شبكة محلّية.');
      console.error('  مرّر العنوان يدوياً:  node scripts/start-lan.cjs --ip=192.168.1.5');
      console.error('  أو استعمل النفق:     node scripts/start-lan.cjs --tunnel');
      process.exit(1);
    }

    env.REACT_NATIVE_PACKAGER_HOSTNAME = ip;

    const skipped = candidates().filter((item) => item.address !== ip);
    console.log(`› عنوان الباركود: ${ip}`);
    if (skipped.length) {
      console.log(`› بطاقات تُجوهلت: ${skipped.map((i) => `${i.address} (${i.name.trim()})`).join('، ')}`);
    }
    console.log('› يجب أن يكون الهاتف على شبكة الواي-فاي نفسها. إن لم يعمل: أضف --tunnel\n');
  }

  const child = spawn('npx', ['expo', 'start', ...passthrough], {
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (!tunnel) prewarm(portFrom(passthrough));

  child.on('exit', (code) => process.exit(code ?? 0));
}

function portFrom(args) {
  const flag = args.indexOf('--port');
  if (flag >= 0 && args[flag + 1]) return Number(args[flag + 1]);
  const inline = args.find((a) => a.startsWith('--port='));
  return inline ? Number(inline.slice('--port='.length)) : 8081;
}

/**
 * يبني حزمة أندرويد **قبل** أن يمسح الهاتف الباركود.
 *
 * البناء البارد لهذا المشروع ~٢٨٠ ثانية (٤٠٠٠+ وحدة، ١٦ ميغابايت). ومهلة
 * التنزيل في Expo Go أقصر من ذلك بكثير، فينقطع الطلب في منتصفه ويظهر
 * `java.io.IOException: Failed to download remote update` — وهي رسالة تبدو
 * عطلاً في الشبكة بينما السبب أن الحزمة لم تكن جاهزة بعد.
 *
 * بعد أول بناء تُخزَّن في ذاكرة Metro، فيصل الهاتف إلى نسخة جاهزة في ثوانٍ.
 * الفشل هنا غير مهمّ: أسوأ ما يحدث أن نعود إلى السلوك القديم.
 */
function prewarm(port) {
  const url =
    `http://127.0.0.1:${port}/index.bundle` +
    `?platform=android&dev=true&hot=false&transform.engine=hermes`;

  const startedAt = Date.now();
  let announced = false;
  const notice = setTimeout(() => {
    announced = true;
    console.log('› جارٍ تجهيز حزمة أندرويد مسبقاً — انتظر رسالة «الحزمة جاهزة» قبل مسح الباركود.');
  }, 4000);

  const attempt = (retriesLeft) => {
    fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((buf) => {
        clearTimeout(notice);
        const seconds = Math.round((Date.now() - startedAt) / 1000);
        const mb = (buf.byteLength / 1048576).toFixed(1);
        console.log(`\n✓ الحزمة جاهزة (${mb} ميغابايت في ${seconds} ثانية) — امسح الباركود الآن.\n`);
      })
      .catch(() => {
        // الخادم لم يستيقظ بعد؛ نعاود بهدوء بدل أن نعلن فشلاً ليس فشلاً.
        if (retriesLeft > 0) return void setTimeout(() => attempt(retriesLeft - 1), 2000);
        clearTimeout(notice);
        if (announced) console.log('› تعذّر التجهيز المسبق — الحزمة ستُبنى عند أول مسح (قد يطول).');
      });
  };

  // مهلة سخيّة: البناء البارد نفسه هو ما ننتظره
  setTimeout(() => attempt(15), 1500);
}

main();
