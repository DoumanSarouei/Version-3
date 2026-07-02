import { useEffect, useState } from "react";
import "./results.css";

type Fields = Record<string, unknown>;

interface ApiResponse {
  id: string;
  fields: Fields;
}

interface ApiError {
  error: string;
}

// ── Utility helpers ───────────────────────────────────────────────────────────

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(asString).filter(Boolean).join("، ");
  return String(v);
}

function firstNonEmpty(...values: string[]): string {
  return values.find((v) => typeof v === "string" && v.trim().length > 0)?.trim() ?? "";
}

function isNoMajorNeed(need: string): boolean {
  const n = need.trim().toLowerCase();
  return (
    n === "no major unmet need" ||
    n === "no_major_gap" ||
    n === "no major gap" ||
    n === "no major need"
  );
}

function formatNeed(need: string): string {
  if (!need) return "";
  const map: Record<string, string> = {
    CONN: "ارتباط",
    AUTO: "خودمختاری / کنترل",
    COMP: "شایستگی / اثربخشی",
    RECOG: "قدردانی / ارزش",
    MEAN: "معنا / هدف",
    SEC: "امنیت / ثبات",
    GROW: "رشد / پیشرفت",
    REC: "بازیابی",
    RECOVERY: "بازیابی",
    NO_MAJOR_GAP: "نیاز برآورده‌نشده‌ی برجسته‌ای دیده نمی‌شود",
    NO_MAJOR_NEED: "نیاز برآورده‌نشده‌ی برجسته‌ای دیده نمی‌شود",
  };
  return map[need.trim().toUpperCase()] ?? need;
}

function formatPattern(pattern: string): string {
  if (!pattern) return "—";
  const map: Record<string, string> = {
    EFFORT_REWARD_STRAIN: "تلاش زیاد، پاداش کم",
    OVERLOAD_RECOVERY_DEFICIT: "فشار زیاد همراه با استراحت ناکافی",
    CONTROL_UNCERTAINTY_STRAIN: "فشار کنترل و عدم‌قطعیت",
    THREAT_ANXIETY_STRAIN: "فشار تهدید و اضطراب",
    RELATIONAL_SUPPORT_DEFICIT: "کمبود حمایت اطرافیان",
    MEANING_VALUE_MISALIGNMENT: "ناهماهنگی معنا و ارزش‌ها",
    RESOURCE_DEPLETION: "کم‌شدن انرژی و منابع",
    NO_CLEAR_PATTERN: "الگوی غالبی دیده نمی‌شود",
    LOW_STRESS_MAINTENANCE: "حفظ وضعیت کم‌استرس",
    LOW_STRESS_WITH_RESOURCE_GAP: "کم‌استرس با تمرکز پیشگیرانه",
    RESPONSE_PATTERN_UNCLEAR: "الگوی پاسخ‌ها نامشخص است",
    UNCLEAR_OR_LOW_VALIDITY: "نامشخص / اعتبار پایین",
  };
  return (
    map[pattern.trim().toUpperCase()] ??
    pattern.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// ── Fixed analogy library (Persian) ─────────────────────────────────────────
// Deterministic, curated text — mirrors Make blueprint Module 145 (V5, role-neutral).
// Do not generate or rewrite this text at render time; only update the string here
// if the source library in the blueprint changes, keeping both in sync.
const analogyLibraryFa: Record<string, string> = {
  OVERLOAD: "مثل جوی آبی است که بیش از گنجایش و ظرفیتش به آن آب بسته‌اند. هرقدر هم تلاش کنید مسیر را باز کنید، آب باز سرریز می‌کند؛ نه چون شما کم تلاش می‌کنید، بلکه چون ورودیِ آب بسیار بیشتر از ظرفیت خروجی آن است. هرچه بیشتر برای عقب نماندن و دوام آوردن فشار بیاورید، فرصت کمتری برای استراحت و جبران انرژی می‌ماند، و وقتی رمق شما کم شود، همان سرعت قبلی هم چند برابر سخت‌تر حس می‌شود.",
  CONTROL: "تصور کنید پشت فرمان ماشینی هستید که در جاده‌ای مه‌آلود حرکت می‌کند؛ تابلوهای راهنما مدام عوض می‌شوند و فرمان هم همیشه درست جواب نمی‌دهد. شما ممکن است بیشتر تلاش کنید، اما وقتی اختیار و پیش‌بینی‌پذیری کم باشد، سخت می‌شود فهمید کدام کار واقعاً کمک می‌کند. همین ابهام می‌تواند شما را به دست‌وپا زدن بیشتر وادار کند، و هرچه بیشتر بدون دیدن اثر روشنی تلاش کنید، وضعیت ناامیدکننده‌تر حس می‌شود.",
  THREAT: "این حالت مثل داستان معروف «مارگزیده از ریسمان سیاه و سفید می‌ترسد» است؛ یا مثل نگهبانی که حتی بعد از آرام شدن اوضاع، همچنان با شک و گوش‌به‌زنگی دنبال نشانه خطر می‌گردد. وقتی ذهن و بدن پیام روشنِ «الان امن است» را دریافت نکنند، به‌جای آرام شدن، آماده مشکل بعدی می‌مانند. این آماده‌باش می‌تواند نشانه‌های کوچک را خطری بزرگ جلوه دهد و خاموش کردن این حالت را سخت‌تر کند.",
  RELATIONAL: "تصور کنید بار سنگینی را بی‌دسته و دستگیره، و بدون اینکه کسی گوشه دیگرش را بگیرد، تنهایی حمل می‌کنید. شاید برای مدتی بتوانید آن را روی دست نگه دارید، اما «یک دست صدا ندارد» و تنهایی حمل کردنش، بیشتر از خودِ بار از شما انرژی می‌گیرد. هرچه انرژی بیشتری صرف تنها نگه داشتن بار شود، توان کمتری برای کمک خواستن، ارتباط گرفتن یا استراحت باقی می‌ماند و بار کم‌کم سنگین‌تر حس می‌شود.",
  MEANING: "تصور کنید با تمام وجود پارو می‌زنید، اما ساحل مقصود و آن فانوس دریایی که برایتان مهم بود، دیگر در افق دیده نمی‌شود. حرکت ادامه دارد، اما وقتی کار به چیزی که برای شما معنا و ارزش دارد وصل نباشد، هر حرکت رمق کمتری به شما برمی‌گرداند. کم شدن این انگیزه درونی باعث می‌شود همان کارهای روزمره بی‌روح و فرسایشی حس شوند، و همین بی‌روحی دوباره وصل شدن به معنا را سخت‌تر می‌کند.",
  RESOURCE: "مثل اسب خسته‌ای است که هم‌زمان بار سنگینی بر دوش دارد، راه درازی در پیش دارد و آب و علوفه‌اش هم کم شده است. در این وضعیت، حتی کارهای معمولی و قدم‌های ساده هم انرژی بیشتری می‌برند، چون حاشیه امن و ابزارهای کمکی کمتر شده‌اند. هرچه رمق آدم پایین‌تر می‌آید، استفاده از چیزهایی که معمولاً کمک می‌کردند سخت‌تر می‌شود و همان خواسته‌های عادی، پرهزینه‌تر حس می‌شوند.",
  EFFORT: "تصور کنید زمینی مدام از شما محصول و بارِ باکیفیت می‌خواهد، اما آب، کود و رسیدگی کافی به این خاک برنمی‌گردد. ممکن است شما همچنان با جان و دل تلاش کنید، اما وقتی قدردانی، انصاف یا نتیجه کافی برنمی‌گردد، توان خاک کم‌کم پایین می‌آید. هرچه بازگشت کمتری حس کنید، نگه داشتن انگیزه سخت‌تر می‌شود و هر تلاش تازه، شیره و انرژی بیشتری از شما می‌مکد.",
  MAINT: "یک باغچه باصفا را تصور کنید که آب، نور و رسیدگیِ باغبانی در آن تقریباً در تعادل است. لازم نیست همه‌چیز بی‌نقص و کامل باشد تا رشد ادامه پیدا کند؛ کافی است شرایط آن‌قدر پایدار باشد که باغچه بعد از پژمردگی‌های معمولِ فصلی، دوباره جان بگیرد. کار مفید الان این است که از همین تعادلی که دارد کمک می‌کند، مراقبت و پاسداری کنید.",
  MAINT_GAP: "تصور کنید سقفی فعلاً سرپاست و بارِ امروز را تحمل می‌کند، اما ستون‌های اصلی‌اش از درون ترک خورده‌اند و این آسیب از بیرون معلوم نیست. اوضاع فعلی شاید مشکلی ایجاد نکند، اما اگر فشارِ اضافه‌ای بیاید، حاشیه امن کمتری برای تحمل وزن بیشتر وجود دارد. قوی‌تر کردن و ترمیم یکی از ستون‌ها از همین حالا، می‌تواند جلوی نشست کردن یا سخت‌تر شدن وضعیت را بگیرد.",
  HIGH_SEVERITY: "تصور کنید در خانه‌ای هستید که از هر گوشه‌اش صدایی بلند شده؛ اجاق گاز سر رفته، تلفن مدام زنگ می‌زند و کسی هم هم‌زمان در می‌زند. هیچ‌کدام به‌تنهایی همه فشار را توضیح نمی‌دهد، اما همه با هم دارند یک‌دفعه حواس، توجه و انرژی شما را غارت می‌کنند. وقتی چند چرخه هم‌زمان فعال است، قدم اول معمولاً حل کردن همه‌چیز با هم نیست؛ بهتر است یکی از صداها یا فشارها کمی پایین بیاید تا جا برای نفس کشیدن باز شود.",
  RESOURCE_CRISIS: "مثل چراغ نفتی یا گردسوزی است که به آخرین قطره‌های نفتش رسیده، اما باد همچنان می‌وزد و از آن نور می‌خواهد. نیاز اول این نیست که به همه کارهای اطرافتان برسید، بلکه باید آن‌قدر انرژی و نفت حفظ شود که اصل این چراغ روشن بماند و خاموش نشود. وقتی منابع این‌قدر پایین آمده‌اند، حتی حل مسئله خوب هم می‌تواند زیادی رمق شما را بگیرد، پس جبران انرژی باید قبل از تغییرات بزرگ‌تر بیاید.",
  NO_CLEAR: "تصور کنید تکه‌ابرهای پراکنده‌ای در آسمان دیده می‌شوند که جهت باد هر کدام را به یک طرف می‌برد، اما هنوز نشانه قطعی از یک باران یا طوفانِ پیش‌رو نیست. ممکن است چیزهایی ارزش توجه داشته باشند، اما نشانه‌ها هنوز به یک چرخه و ریشه اصلی اشاره نمی‌کنند. قدم مفید این است که ببینید چه چیزی چند بار تکرار می‌شود، نه اینکه خیلی زود یک توضیح قطعی بسازید.",
  LOW_VALIDITY: "تصور کنید می‌خواهید تصویر خود یا شیئی را در یک حوض آب گل‌آلود یا یک شیشه بخارگرفته ببینید. شاید چیزهای واقعی در آن باشد، اما تصویر آن‌قدر تار و نامشخص است که نمی‌شود با اطمینان گفت دقیقاً چه الگویی دیده می‌شود. این یعنی پاسخ‌ها برای یک تفسیر محکم به اندازه کافی روشن نیستند، نه اینکه حتماً مشکلی در میزان استرس شما وجود دارد.",
};

const ANALOGY_MIXED_TEMPLATE_FA =
  "تصور کنید مثل شمعی است که از دو طرف می‌سوزد و دو شعله هم‌زمان دارند از یک منبعِ محدود، موم و انرژی می‌کشند: [PATTERN_A] یک بخش از این فشار را مدام روشن و سوزان نگه می‌دارد و [PATTERN_B] اجازه نمی‌دهد بخش دیگر آرام بگیرد و خنک شود. وقتی هر دو با هم فعال‌اند، برای هرکدام رمق و فضای کمتری می‌ماند. معمولاً این چرخه زمانی سبک‌تر می‌شود که اول یکی از این دو شعله یا فشارها، حتی خیلی کوچک، کم شود.";

function getMixedAnalogyFa(primaryCode: string, secondaryCode: string): string {
  const a = formatPattern(primaryCode) || "یک الگوی استرس";
  const b =
    secondaryCode && secondaryCode.trim().toUpperCase() !== "NONE" && secondaryCode.trim() !== ""
      ? formatPattern(secondaryCode)
      : "فشار دیگر";
  return ANALOGY_MIXED_TEMPLATE_FA.replace("[PATTERN_A]", a).replace("[PATTERN_B]", b);
}

function getAnalogyText(analogyKey: string, primaryCode: string, secondaryCode: string): string {
  const key = analogyKey.trim().toUpperCase();
  if (!key) return "";
  if (key === "MIXED") return getMixedAnalogyFa(primaryCode, secondaryCode);
  return analogyLibraryFa[key] ?? "";
}

function patternAnchor(pattern: string): string {
  const p = pattern.toUpperCase();
  if (p === "LOW_STRESS_MAINTENANCE")
    return "پاسخ‌های شما در حال حاضر یک الگوی فعال استرس را نشان نمی‌دهد. این نتیجه را بهتر است به‌عنوان یک تصویر «حفظ و پیشگیری» بخوانید.";
  if (p === "LOW_STRESS_WITH_RESOURCE_GAP")
    return "سطح استرس فعلی شما پایین است، اما یک نیاز یا حوزه‌ی منابع ممکن است نیازمند توجه پیشگیرانه باشد.";
  if (p === "RESPONSE_PATTERN_UNCLEAR" || p === "UNCLEAR_OR_LOW_VALIDITY")
    return "الگوی پاسخ‌ها برای یک تفسیر دقیق استرس، ابهام زیادی دارد.";
  if (p === "NO_CLEAR_PATTERN")
    return "هیچ الگوی واحدی غالب نیست. نتیجه‌ی شما یک تصویر ترکیبی یا کم‌سیگنال را نشان می‌دهد.";
  if (p.includes("MEANING"))
    return "شاید مشکل فشار زیاد نباشد؛ شاید ارتباط شما با معنا کم‌رنگ شده است.";
  if (p.includes("OVERLOAD"))
    return "شاید شکست نخورده‌اید؛ شاید سیستم شما فقط بیش از حد بارگذاری شده است.";
  if (p.includes("CONTROL"))
    return "شاید ضعیف نیستید؛ شاید کنترل کافی در دست شما نیست.";
  if (p.includes("RELATIONAL") || p.includes("CONNECTION"))
    return "شاید بیش‌ازحد حساس نیستید؛ شاید استرس شما ریشه‌ی رابطه‌ای دارد.";
  if (p.includes("EFFORT") || p.includes("REWARD"))
    return "شاید استرس شما از زیاد کار کردن نباشد، بلکه از فاصله میان تلاش و آنچه بازمی‌گردد.";
  if (p.includes("THREAT") || p.includes("ANXIETY"))
    return "شاید سیستم شما سخت در تلاش است تا از شما محافظت کند، حتی وقتی تهدید فوری نیست.";
  if (p.includes("RESOURCE"))
    return "شاید توان مقابله‌ی شما در حال حاضر کمتر از معمول است؛ نه از سر ضعف، بلکه از تحلیل‌رفتن منابع.";
  return "نتیجه‌ی فعلی یک الگوی واقعی را نشان می‌دهد، نه یک نقص شخصی.";
}

function startHereText(
  pattern: string,
  isLowMaint: boolean,
  isLowGap: boolean,
  isUnclear: boolean
): string {
  if (isLowMaint)
    return "با درست‌کردن مشکلاتی که وجود ندارند شروع نکنید. با شناسایی آنچه می‌خواهید حفظ کنید شروع کنید: کدام عادت‌ها، منابع یا روال‌ها در حال حاضر به شما کمک می‌کنند؟";
  if (isLowGap)
    return "با همان یک حوزه که کمی کم‌توجه مانده شروع کنید؛ یک اقدام کوچک پیشگیرانه می‌تواند احتمال استرس آینده را کم کند.";
  if (isUnclear)
    return "با تأمل شروع کنید، نه با اقدام. پیش از انتخاب یک راهبرد، روشن کنید واقعاً چه چیزی الان استرس شما را پیش می‌برد.";
  const p = pattern.toUpperCase();
  if (p.includes("MEANING"))
    return "با بهره‌وری شروع نکنید. با پیوند دوباره شروع کنید: همین حالا چه چیزی برای شما واقعاً معنا دارد؟";
  if (p.includes("OVERLOAD"))
    return "با بهینه‌سازی شروع نکنید. با بازیابی شروع کنید: قبل از اینکه از خود بیشتر بخواهید، بار را کم کنید.";
  if (p.includes("CONTROL"))
    return "با کمال‌گرایی شروع نکنید. با کنترل شروع کنید: یک حوزه را پیدا کنید که می‌توانید بر گام بعدی آن اثر بگذارید.";
  if (p.includes("RELATIONAL") || p.includes("CONNECTION"))
    return "با درست‌کردن همه‌چیز شروع نکنید. با یک نیاز رابطه‌ای صادقانه یا یک تماس حمایتی امن شروع کنید.";
  if (p.includes("EFFORT") || p.includes("REWARD"))
    return "با شناسایی یک حوزه شروع کنید که تلاش شما در آن منصفانه پاسخ نمی‌گیرد، و ببینید یک ترازِ کوچک چه شکلی می‌تواند داشته باشد.";
  if (p.includes("THREAT") || p.includes("ANXIETY"))
    return "با امنیت و آرام‌سازی شروع کنید، نه با حل مسئله. چه چیزی به آرام‌شدن سیستم شما کمک می‌کند؟";
  if (p.includes("RESOURCE"))
    return "با بازسازی شروع کنید، نه با عملکرد. کوچک‌ترین اقدام بازیابی که امروز در دسترس شماست چیست؟";
  return "با کوچک‌ترین گام بعدی شروع کنید که استرس را کم و وضوح را بیشتر می‌کند.";
}

function isSafePressureSource(raw: string): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return (
    v !== "" &&
    v !== "press" &&
    v !== "empty" &&
    v !== "null" &&
    v !== "undefined" &&
    v !== "n/a" &&
    v !== "-"
  );
}

function safeNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatReportDate(raw: string): string {
  const value = (raw || "").trim();
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
  if (!value) return new Date().toLocaleDateString("fa-IR", opts);
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("fa-IR", opts);
}

function humanSpeedFlag(flag: string): string {
  const f = flag.toUpperCase();
  if (f === "VERY_FAST" || f === "VERY FAST") return "پاسخ‌ها بسیار سریع داده شده‌اند";
  if (f === "FAST") return "پاسخ‌ها سریع‌تر از حد معمول بوده‌اند";
  if (f === "SLOW") return "پاسخ‌ها کندتر از حد معمول بوده‌اند";
  return flag.toLowerCase().replace(/_/g, " ");
}

// Convert Latin digits in a string to Persian digits.
function toPersianDigits(s: string): string {
  const fa = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return s.replace(/[0-9]/g, (d) => fa[Number(d)]);
}

// Format an age group like "35-44" or "35–44" → "۳۵ تا ۴۴ سال"; "65+" → "۶۵ سال به بالا".
function formatAgeGroup(raw: string): string {
  if (!raw) return "";
  const v = raw.trim();
  const plus = v.match(/^(\d+)\s*\+$/);
  if (plus) return `${toPersianDigits(plus[1])} سال به بالا`;
  const range = v.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (range) return `${toPersianDigits(range[1])} تا ${toPersianDigits(range[2])} سال`;
  const under = v.match(/^under\s*(\d+)$/i);
  if (under) return `زیر ${toPersianDigits(under[1])} سال`;
  return toPersianDigits(v);
}

// ── Translate English context values that arrive from Airtable ──────────────────
const ROLE_TOKENS: Record<string, string> = {
  "parent": "والد",
  "caregiver": "مراقب",
  "student": "دانشجو",
  "working professional": "شاغل",
  "professional": "شاغل",
  "manager": "مدیر",
  "team lead": "سرپرست تیم",
  "manager / team lead": "مدیر / سرپرست تیم",
  "leader": "مدیر / سرپرست تیم",
  "healthcare professional": "کادر درمان",
  "healthcare worker": "کادر درمان",
  "teacher": "معلم",
  "educator": "مدرس",
  "entrepreneur": "کارآفرین",
  "freelancer": "فریلنسر",
  "athlete": "ورزشکار",
  "performer": "اجراگر",
  "self-employed": "خویش‌فرما",
  "currently not working": "در حال حاضر شاغل نیست",
  "retired": "بازنشسته",
  "unemployed": "در حال حاضر شاغل نیست",
  "other": "سایر",
};

// Full-string role mappings (exact combos take priority over token-splitting).
const ROLE_FULL: Record<string, string> = {
  "parent / caregiver": "والد / مراقب",
  "caregiver / parent": "والد / مراقب",
  "manager / team lead": "مدیر / سرپرست تیم",
  "teacher / educator": "معلم / مدرس",
  "entrepreneur / freelancer": "کارآفرین / فریلنسر",
  "athlete / performer": "ورزشکار / اجراگر",
};

function translateRole(raw: string): string {
  if (!raw) return "";
  const key = raw.trim().toLowerCase();
  if (ROLE_FULL[key]) return ROLE_FULL[key];
  if (ROLE_TOKENS[key]) return ROLE_TOKENS[key];
  // Handle any "A / B" or "A/B" combination by translating each side.
  if (key.includes("/")) {
    const parts = raw.split("/").map((p) => p.trim());
    const translated = parts.map((p) => ROLE_TOKENS[p.toLowerCase()] ?? p);
    return translated.join(" / ");
  }
  return raw;
}

const GOAL_MAP: Record<string, string> = {
  "reduce overwhelm": "کم کردن احساس غرق‌شدن",
  "feel calmer": "آرام‌تر شدن",
  "sleep better": "خواب بهتر",
  "think more clearly": "روشن‌تر فکر کردن",
  "improve focus and productivity": "تمرکز و کارایی بیشتر",
  "feel emotionally stronger": "توان عاطفی بیشتر",
  "improve work-life balance": "تعادل بهتر بین کار و زندگی",
  "improve work life balance": "تعادل بهتر بین کار و زندگی",
  "feel more motivated": "انگیزه بیشتر",
  "understand myself better": "شناخت بهتر خودم",
  "improve relationships": "بهبود رابطه‌ها",
  "manage stress": "مدیریت استرس",
  "build resilience": "تقویت تاب‌آوری",
  "maintain my wellbeing": "حفظ سلامت و تعادل فعلی",
  "feel less anxious": "کاهش اضطراب",
  "more energy": "انرژی بیشتر",
  "better focus": "تمرکز بهتر",
  "nothing": "فعلاً چیزی",
};

function translateGoal(raw: string): string {
  if (!raw) return "";
  return GOAL_MAP[raw.trim().toLowerCase()] ?? raw;
}

// Evidence-level badge values arriving from Airtable (A/B/MODERATE/EVIDENCE_INFORMED…).
function translateEvidence(raw: string): string {
  if (!raw) return "";
  const map: Record<string, string> = {
    "high": "قوی",
    "moderate": "متوسط",
    "medium": "متوسط",
    "low": "محدود",
    "evidence_informed": "مبتنی بر شواهد",
    "evidence informed": "مبتنی بر شواهد",
    "a": "قوی",
    "b": "متوسط",
    "c": "محدود",
  };
  return map[raw.trim().toLowerCase()] ?? raw;
}

// Safe exact-substring replacements for stray English words inside any displayed string.
function normalizeText(s: string): string {
  if (!s) return s;
  return s
    .replace(/overwhelm/gi, "احساس غرق‌شدن")
    .replace(/\bunsupported\b/gi, "بدون پشتوانه کافی");
}

// Remap the Persian score-label strings that arrive from Airtable to simpler native phrasing.
function translateMetricLabel(raw: string): string {
  if (!raw) return raw;
  const map: Record<string, string> = {
    "بار استرس خفیف": "فشار فعلی خفیف",
    "بار استرس متوسط": "فشار فعلی متوسط",
    "بار استرس بالا": "فشار فعلی بالا",
    "بار استرس کم": "فشار فعلی کم",
    "نشانه فشار فرساینده و خطر کاهش بازیابی": "نشانه فشار طولانی‌مدت و کمبود استراحت",
    "نشانه خفیف فشار فرساینده و خطر کاهش بازیابی": "نشانه خفیف فشار طولانی‌مدت و کمبود استراحت",
    "نشانه‌ی فشار فرساینده": "نشانه فشار طولانی‌مدت",
  };
  return map[raw.trim()] ?? raw;
}

function translateRecharge(raw: string): string {
  if (!raw) return "";
  const v = raw.trim().toLowerCase();
  if (v.includes("good recharge") || v.includes("relatively preserved"))
    return "بازیابی نسبتاً خوب حفظ شده است";
  if (v.includes("moderate recharge") || v.includes("partly available"))
    return "بازیابی تا حدی در دسترس است";
  if (v.includes("low recharge") || v.includes("should be prioritized"))
    return "بازیابی پایین؛ باید در اولویت قرار گیرد";
  return raw;
}

// ── Glossary: fluent Persian definitions, shown on hover/tap ────────────────────

const GLOSSARY: Record<string, string> = {
  "میزان فشار فعلی":
    "میزان فشاری که هم‌اکنون بر شما وارد است؛ ترکیبی از مسئولیت‌ها، نشانه‌های استرس و اثر آن بر زندگی روزمره. عددی بین ۰ تا ۱۰۰ که بالاتر یعنی فشار بیشتر.",
  "نشانه فشار طولانی‌مدت و کمبود استراحت":
    "نشانه‌ای پیشگیرانه از خستگی فرسایشی؛ یعنی فشار طولانی همراه با استراحت ناکافی که در بلندمدت می‌تواند انرژی و توان شما را کم کند. این یک تشخیص پزشکی نیست.",
  "نشانه خفیف فشار طولانی‌مدت و کمبود استراحت":
    "نشانه‌ای پیشگیرانه و خفیف از خستگی فرسایشی؛ یعنی فشار طولانی همراه با استراحت ناکافی که بهتر است از همین حالا به آن توجه کنید. این یک تشخیص پزشکی نیست.",
  "سنگینی مسئولیت‌ها":
    "حجم کارها، مسئولیت‌ها و انتظاراتی که هم‌زمان بر دوش شماست.",
  "فشار ذهنی و نگرانی":
    "فشاری که از نگاه و ارزیابی ذهنی شما به وضعیت می‌آید؛ مثل حس کنترل کم یا پیش‌بینی‌ناپذیری.",
  "نشانه‌های فشار":
    "شدت نشانه‌های استرس که تجربه می‌کنید؛ مثل تنش، نگرانی، خستگی یا بی‌خوابی.",
  "اثر روی زندگی روزمره":
    "میزانی که استرس روی توان شما در انجام کارهای روزمره، کار و تصمیم‌گیری اثر گذاشته است.",
  "فشار ناشی از کمبود منابع":
    "میزان کم‌شدن منابع درونی و بیرونی شما؛ یعنی انرژی، حمایت یا توانی که در دسترس کمتری قرار گرفته است.",
  "ریسک ادامه‌دار شدن":
    "نشانه‌ای از اینکه این فشار چقدر ممکن است طولانی یا ادامه‌دار باشد، نه فقط یک وضعیت گذرا.",
  "خستگی فرسایشی":
    "حالت تخلیه‌ی عمیق انرژی جسمی و ذهنی که از فشار طولانی و استراحت ناکافی ایجاد می‌شود.",
  "کمبود استراحت واقعی":
    "نبود فرصت یا کیفیت کافی برای برگشتن به حالت عادی پس از فشار؛ مثل استراحت، خواب یا فاصله‌ گرفتن واقعی از کار.",
  "تلاش زیاد، پاداش کم":
    "فاصله میان آنچه می‌گذارید و آنچه به‌صورت قدردانی، حمایت یا نتیجه به شما بازمی‌گردد.",
};

function Term({ label }: { label: string }) {
  const def = GLOSSARY[label];
  if (!def) return <>{label}</>;
  return (
    <span className="r-term" tabIndex={0}>
      {label}
      <span className="r-term-tip" role="tooltip">
        {def}
      </span>
    </span>
  );
}

// ── Pattern palette ───────────────────────────────────────────────────────────

const PATTERNS: Record<string, { label: string; color: string; bg: string }> = {
  OVERLOAD_RECOVERY_DEFICIT: { label: "فشار زیاد همراه با استراحت ناکافی", color: "#B45309", bg: "#FEF3C7" },
  CONTROL_UNCERTAINTY_STRAIN: { label: "فشار کنترل / عدم‌قطعیت", color: "#1D4ED8", bg: "#EFF6FF" },
  THREAT_ANXIETY_STRAIN: { label: "فشار تهدید / اضطراب", color: "#9F1239", bg: "#FFF1F2" },
  RELATIONAL_SUPPORT_DEFICIT: { label: "کمبود حمایت اطرافیان", color: "#7C3AED", bg: "#F5F3FF" },
  MEANING_VALUE_MISALIGNMENT: { label: "ناهماهنگی معنا / ارزش", color: "#0F766E", bg: "#F0FDFA" },
  RESOURCE_DEPLETION: { label: "کم‌شدن انرژی و منابع", color: "#92400E", bg: "#FEF3C7" },
  EFFORT_REWARD_STRAIN: { label: "تلاش زیاد، پاداش کم", color: "#B91C1C", bg: "#FEF2F2" },
  LOW_STRESS_MAINTENANCE: { label: "کم‌استرس — حفظ وضعیت", color: "#15803D", bg: "#F0FDF4" },
  MIXED_STRESS_PATTERN: { label: "الگوی استرس ترکیبی", color: "#6B7280", bg: "#F9FAFB" },
  NO_CLEAR_PATTERN: { label: "الگوی ترکیبی", color: "#6B7280", bg: "#F9FAFB" },
};
const DEFAULT_PATTERN = { label: "ارزیابی استرس", color: "#6B7280", bg: "#F9FAFB" };

function getPattern(raw: string) {
  return PATTERNS[raw.trim().toUpperCase()] ?? DEFAULT_PATTERN;
}

function scoreColor(v: number): string {
  if (v >= 70) return "#B91C1C";
  if (v >= 50) return "#B45309";
  if (v >= 30) return "#0F766E";
  return "#15803D";
}

function arcDasharray(pctVal: number): string {
  const ARC = 212.06,
    CIRC = 282.74;
  const fill = ARC * (Math.min(100, Math.max(0, pctVal)) / 100);
  return `${fill.toFixed(2)} ${(CIRC - fill).toFixed(2)}`;
}

function needGapColor(v: number): string {
  if (v >= 3) return "#E53935";
  if (v >= 2) return "#FF9800";
  return "#D1D5DB";
}

function zoneColor(zone: string): string {
  const z = zone.trim().toUpperCase();
  if (z === "LOW") return "#4CAF50";
  if (z === "MILD") return "#F5C518";
  if (z === "MODERATE") return "#FF9800";
  if (z === "HIGH") return "#E53935";
  return "#6B7280";
}

function resourceBarColor(v: number): string {
  if (v <= 2) return "#B91C1C";
  if (v <= 3) return "#B45309";
  return "#15803D";
}

function shouldShowDailyExperience(f: Fields): boolean {
  const stressLoad = safeNum(f["stress_load_score_100"]);
  const symptomLoad =
    f["symptom_load"] != null ? safeNum(f["symptom_load"]) : safeNum(f["stress_symptom_100"]) / 20;
  const functionalImpact =
    f["functional_impact"] != null
      ? safeNum(f["functional_impact"])
      : safeNum(f["stress_function_100"]) / 20;
  const cognitiveScore = safeNum(f["cognitive_score"]);
  const emotionalScore = safeNum(f["emotional_score"]);
  const physicalScore = safeNum(f["physical_score"]);
  const behavioralScore = safeNum(f["behavioral_score"]);

  if (stressLoad >= 50 || symptomLoad >= 3 || functionalImpact >= 3) return true;
  if (stressLoad >= 30 && stressLoad < 50) {
    return (
      cognitiveScore >= 3 ||
      emotionalScore >= 3 ||
      physicalScore >= 3 ||
      behavioralScore >= 3 ||
      functionalImpact >= 3
    );
  }
  return false;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Loading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: 18,
        color: "#A8A29E",
        background: "#F7F5F1",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: "2px solid #E7E5E0",
          borderTopColor: "#1C6650",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: 13 }}>در حال بارگذاری گزارش شما…</div>
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F7F5F1",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #FEE2E2",
          padding: 32,
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "#991B1B",
            marginBottom: 8,
            fontFamily: "Vazirmatn, Georgia, serif",
            fontWeight: 700,
          }}
        >
          گزارش پیدا نشد
        </h2>
        <p style={{ color: "#6B7280", fontSize: 14, marginTop: 8 }}>{message}</p>
      </div>
    </div>
  );
}

// Polite placeholder shown in place of any input-dependent section when the
// submission is flagged low-validity (output_mode === "LOW_VALIDITY"). The
// report keeps its full professional structure; only the parts that need
// trustworthy answers are replaced by this notice.
function GatedNotice() {
  return (
    <div
      style={{
        padding: "18px 22px",
        border: "1px solid #E7E5E0",
        borderRadius: 12,
        background: "#FAF8F4",
        color: "#78716C",
        fontSize: 14,
        lineHeight: 1.9,
      }}
    >
      این بخش از گزارش نمایش داده نمی‌شود، چون پاسخ‌های این بار برای تفسیر مطمئن کمی شتاب‌زده یا
      ناهماهنگ بوده‌اند. لطفاً پرسش‌نامه را با کمی حوصله‌ی بیشتر دوباره پر کنید تا این بخش نمایش
      داده شود.
    </div>
  );
}

function ArcGauge({ score, color }: { score: number; color: string }) {
  return (
    <svg width="72" height="72" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      <circle
        cx="60"
        cy="60"
        r="45"
        fill="none"
        stroke="#E7E5E0"
        strokeWidth="9"
        strokeDasharray="212.06 70.69"
        strokeLinecap="round"
        transform="rotate(135 60 60)"
      />
      <circle
        cx="60"
        cy="60"
        r="45"
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeDasharray={arcDasharray(score)}
        strokeLinecap="round"
        transform="rotate(135 60 60)"
      />
    </svg>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const display = max === 100 ? Math.round(value) : value.toFixed(1);
  return (
    <div className="r-bar-row">
      <div className="r-bar-meta">
        <span className="r-bar-name"><Term label={label} /></span>
        <span className="r-bar-val" style={{ color }}>
          {display}
          {max !== 100 ? `/${max}` : ""}
        </span>
      </div>
      <div className="r-bar-track">
        <div className="r-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function DomainCard({ icon, name, text }: { icon: string; name: string; text: string }) {
  if (!text) return null;
  return (
    <div className="r-domain-card">
      <div className="r-domain-icon">{icon}</div>
      <div className="r-domain-name">{name}</div>
      <div className="r-domain-text">{text}</div>
    </div>
  );
}

function RecoCard({
  n,
  title,
  target,
  why,
  how,
  timeFrame,
  difficulty,
  evidenceLevel,
  color,
}: {
  n: number;
  title: string;
  target?: string;
  why?: string;
  how?: string;
  timeFrame?: string;
  difficulty?: string;
  evidenceLevel?: string;
  color: string;
}) {
  if (!title) return null;
  return (
    <div className="r-reco-card" style={{ borderColor: `${color}22` }}>
      <div className="r-reco-accent" style={{ background: color }} />
      <div className="r-reco-header">
        <div className="r-reco-num" style={{ background: `${color}18`, color }}>
          {n}
        </div>
        <div>
          <div className="r-reco-title">{title}</div>
          {target && <div className="r-reco-target">{target}</div>}
        </div>
      </div>
      <div className="r-reco-badges">
        {evidenceLevel &&
          (() => {
            const ev = translateEvidence(evidenceLevel);
            const isInformed =
              evidenceLevel.trim().toLowerCase() === "evidence_informed" ||
              evidenceLevel.trim().toLowerCase() === "evidence informed";
            return <span className="r-badge">{isInformed ? ev : `شواهد ${ev}`}</span>;
          })()}
        {difficulty && <span className="r-badge">{difficulty}</span>}
        {timeFrame && <span className="r-badge">⏱ {timeFrame}</span>}
      </div>
      {why && <div className="r-reco-why">{why}</div>}
      {how && (
        <>
          <div className="r-reco-how-label">روش انجام</div>
          <div className="r-reco-how">{how}</div>
        </>
      )}
    </div>
  );
}

function QualityWarning({
  level,
  score,
  speedFlag,
  noStressContradiction,
}: {
  level: string;
  score: number;
  speedFlag: string;
  noStressContradiction: string;
}) {
  if (!level || level === "HIGH") return null;
  const isInvalid = level === "INVALID";
  const title = isInvalid
    ? "اعتبار این نتیجه پایین است"
    : level === "LOW"
      ? "این نتیجه را با احتیاط بخوانید"
      : "نتیجه‌ی جهت‌دهنده";
  const body = isInvalid
    ? "این الگوی پاسخ برای یک تفسیر قوی به‌اندازه‌ی کافی قابل اعتماد نیست. لطفاً این نتیجه را به‌عنوان یک محرک برای تأمل در نظر بگیرید، نه یک تصویر استرس."
    : level === "LOW"
      ? "برخی الگوهای پاسخ نشان‌دهنده‌ی اعتبار پایین‌تر هستند. ممکن است این نتیجه به‌طور کامل وضعیت واقعی استرس شما را بازتاب ندهد."
      : "این نتیجه قابل تفسیر است، اما برخی الگوهای پاسخ نشان می‌دهند بهتر است آن را به‌عنوان جهت‌دهی بخوانید، نه یک تصویر دقیق.";
  const showSpeedFlag = speedFlag && speedFlag.toUpperCase() !== "OK" && speedFlag.trim() !== "";
  return (
    <div className={`r-warning-banner ${isInvalid ? "invalid" : "low"}`}>
      <div className="r-warning-title" style={{ color: isInvalid ? "#991B1B" : "#92400E" }}>
        {title}
      </div>
      <p
        className="r-warning-body"
        style={{ color: isInvalid ? "#B91C1C" : "#B45309", margin: 0 }}
      >
        {body}
      </p>
      {noStressContradiction === "YES" && (
        <p
          style={{
            fontSize: 13,
            marginTop: 8,
            margin: 0,
            color: isInvalid ? "#B91C1C" : "#B45309",
          }}
        >
          شما گزینه‌ی «بدون استرس فعلی» را انتخاب کرده‌اید، اما برخی پاسخ‌های مرتبط با استرس بالا بوده‌اند. این می‌تواند نشانه‌ی تفسیر ترکیبی یا پاسخ‌دهی شتاب‌زده باشد.
        </p>
      )}
      {showSpeedFlag && (
        <p
          style={{
            fontSize: 12,
            marginTop: 8,
            margin: 0,
            color: isInvalid ? "#B91C1C" : "#B45309",
          }}
        >
          نکته درباره‌ی سرعت: {humanSpeedFlag(speedFlag)}.
        </p>
      )}
      {score > 0 && (
        <p
          style={{
            fontSize: 11,
            marginTop: 8,
            margin: 0,
            color: isInvalid ? "#EF4444" : "#D97706",
          }}
        >
          نمره‌ی کیفیت پاسخ: {score}
        </p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ResultsPage({ rid }: { rid: string | null }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!rid) {
        setLoading(false);
        setError(
          "شناسه‌ی نتیجه‌ای ارائه نشده است. برای دیدن گزارش، ?rid=شناسه را به آدرس اضافه کنید."
        );
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/results/${rid}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as ApiError | null;
          throw new Error(
            body?.error ?? (res.status === 404 ? "نتیجه پیدا نشد." : "مشکلی پیش آمد.")
          );
        }
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "خطای ناشناخته");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [rid]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("لینک نتیجه‌ی خود را کپی کنید:", url);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} />;
  if (!data) return <ErrorView message="داده‌ای در دسترس نیست." />;

  const f = data.fields;
  const get = (key: string) => normalizeText(asString(f[key]));

  // ── Pattern ──
  const rawPattern = get("primary_pattern (text)") || get("primary_pattern") || "";
  const pat = getPattern(rawPattern);
  const primary = rawPattern;
  const secondary = get("secondary_pattern");
  const showSecondary = secondary && secondary.toUpperCase() !== "NONE" && secondary.trim() !== "";

  const analogyKey = get("analogy_key") || get("ANALOGY_KEY");
  const analogyText = analogyKey ? getAnalogyText(analogyKey, primary, secondary) : "";

  const stressProfileType = get("stress_profile_type");
  const stressProfileTitle = get("stress_profile_title");
  const stressProfileSubtitle = get("stress_profile_subtitle");
  const responseQualityLevel = get("response_quality_level").toUpperCase();
  const responseQualityScore = safeNum(f["response_quality_score"]);
  const speedFlag = get("speed_flag");
  const noStressContradiction = get("no_stress_contradiction").toUpperCase();

  const isLowStressMaintenance =
    stressProfileType === "LOW_STRESS_MAINTENANCE" ||
    primary.toUpperCase() === "LOW_STRESS_MAINTENANCE";
  const isLowStressWithGap =
    stressProfileType === "LOW_STRESS_WITH_RESOURCE_GAP" ||
    primary.toUpperCase() === "LOW_STRESS_WITH_RESOURCE_GAP";
  const isUnclearOrInvalid =
    stressProfileType === "UNCLEAR_OR_LOW_VALIDITY" ||
    primary.toUpperCase() === "RESPONSE_PATTERN_UNCLEAR" ||
    responseQualityLevel === "INVALID";
  const hasQualityWarning =
    ["MEDIUM", "LOW", "INVALID"].includes(responseQualityLevel) ||
    noStressContradiction === "YES";

  // Low-validity gate: when output_mode flags the result as untrustworthy,
  // input-dependent sections are replaced by a polite placeholder. The report
  // keeps its full structure; safe sections (gauges, identity chips, the quality
  // warning, the summary, the closing question and disclaimer) still render.
  const outputMode = get("output_mode").toUpperCase();
  const isLowValidity = outputMode === "LOW_VALIDITY";

  // ── Profile fields ──
  const heroTitle =
    stressProfileTitle ||
    (isLowStressMaintenance
      ? "در حال حاضر سیگنال استرس فعالی دیده نمی‌شود"
      : isLowStressWithGap
        ? "استرس فعلی پایین با یک تمرکز پیشگیرانه"
        : isUnclearOrInvalid
          ? "الگوی پاسخ‌ها نامشخص است"
          : formatPattern(primary));
  const heroSubtitle = stressProfileSubtitle || patternAnchor(primary);

  // ── AI text ──
  const aiSummary = get("ai_summary");
  const aiMechanism = get("ai_mechanism");
  const aiWhyItMatters = get("ai_why_it_matters");
  const aiMaintenanceLoop = get("ai_maintenance_loop");
  const aiMainNeedExplanation = get("ai_main_need_explanation");
  const aiResourceInterpretation = get("ai_resource_interpretation");
  const aiFirstStep = get("ai_first_step");
  const aiReflection = get("ai_reflection");
  const aiConfidence = get("ai_confidence");
  const aiInterventionSummary = get("ai_intervention_summary");
  const aiDurationNote = get("ai_duration_burnout_risk_note");
  const aiDeeperTitle = get("ai_deeper_context_title");
  const aiDeeperText = get("ai_deeper_context");
  const aiNarrativeFit = get("ai_narrative_fit_note");
  const aiCautionNote = get("ai_caution_note");

  // ── Context ──
  const roleContext = translateRole(get("role_context"));
  const pressureSourcesRaw = get("pressure_sources");
  const pressureSources = isSafePressureSource(pressureSourcesRaw) ? pressureSourcesRaw : "";
  const improvementGoal = get("improvement_goal");
  const rechargeScore = get("recharge_score");
  const rechargeLevelText = translateRecharge(get("recharge_level_text"));
  const ageGroup = get("age_group");

  const safeGoal = (() => {
    const v = improvementGoal.trim().toLowerCase();
    if (
      !v ||
      v === "unknown goal" ||
      v === "unknown" ||
      v === "null" ||
      v === "undefined" ||
      v === "n/a" ||
      v === "-"
    )
      return "";
    return translateGoal(improvementGoal.trim());
  })();

  const rechargeDisplay = rechargeScore
    ? `${rechargeScore}/۵${rechargeLevelText ? ` · ${rechargeLevelText}` : ""}`
    : rechargeLevelText || "";

  // ── Alert card ──
  const topAlertScore = safeNum(f["top_alert_score"]);
  const topAlertText = get("top_alert_display_text");
  const showTopAlert = topAlertScore >= 50 && topAlertScore > 0;

  // ── Mirror / closing ──
  const mirrorSentence = get("mirror_sentence");
  const closingStatement = get("closing_statement");

  // ── Scores ──
  const stressLoadScore = safeNum(f["stress_load_score_100"]);
  const stressLoadLevel = get("stress_load_level_100");
  const stressLoadLabel = translateMetricLabel(get("stress_load_label_100") || stressLoadLevel);
  const stressZone = get("stress_zone");
  const burnoutRiskScore = safeNum(f["burnout_risk_score_100"]);
  const burnoutRiskLevel = get("burnout_risk_level_100");
  const burnoutRiskLabel = translateMetricLabel(get("burnout_risk_label_100") || burnoutRiskLevel);
  const burnoutZone = get("burnout_zone");

  // ── Clarity / confidence ──
  const patternClarityLevel = get("pattern_clarity_level");
  const patternConfidenceFinal = get("pattern_confidence_final");
  const burnoutDisplayName = translateMetricLabel(
    firstNonEmpty(get("burnout_display_name"), "نشانه فشار طولانی‌مدت و کمبود استراحت")
  );

  const stressGaugeColor = stressZone ? zoneColor(stressZone) : scoreColor(stressLoadScore);
  const burnoutGaugeColor = burnoutZone ? zoneColor(burnoutZone) : scoreColor(burnoutRiskScore);

  // ── Need/resource data ──
  const need = get("need") || get("main_need");
  const needFormatted = formatNeed(need);

  const needMap: [string, string][] = [
    ["ارتباط", "gap_conn"],
    ["اختیار", "gap_auto"],
    ["توانمندی", "gap_comp"],
    ["دیده‌شدن / قدردانی", "gap_rec"],
    ["معنا", "gap_mean"],
    ["امنیت", "gap_sec"],
    ["رشد", "gap_grow"],
  ];

  const resMap: [string, string][] = [
    ["توان مقابله", "r_int_score"],
    ["انرژی بدنی", "r_phy_score"],
    ["حمایت اطرافیان", "r_soc_score"],
    ["نظم روزمره", "r_str_score"],
    ["معنا", "r_mean_score"],
  ];

  // A need column that is entirely flat (e.g. every gap = 0) is a noise
  // fingerprint, not a real signal — so suppress the whole needs/resources
  // panel in that case, regardless of validity flag.
  const needVals = needMap.map(([, k]) => safeNum(f[k]));
  const resVals = resMap.map(([, k]) => safeNum(f[k]));
  const needsAllFlat = needVals.every((v) => v === needVals[0]);
  const hasNeedData =
    (!needsAllFlat && needVals.some((v) => v > 0)) || resVals.some((v) => v > 0);

  // ── Domains ──
  const domains: [string, string, string][] = [
    ["🧠", "تمرکز", get("cog_attention")],
    ["⚖️", "تصمیم‌گیری", get("cog_decision")],
    ["💾", "حافظه", get("cog_memory")],
    ["🎛", "خودتنظیمی", get("cog_regulation")],
    ["🫀", "بدن", get("body")],
    ["💭", "افکار", get("thoughts")],
    ["🌊", "هیجان‌ها", get("emotions")],
    ["↩", "رفتار", get("behavior")],
    ["💼", "کار", get("life_work")],
    ["🤝", "روابط", get("life_rel")],
    ["📅", "زندگی روزمره", get("life_daily")],
  ].filter((d) => d[2]) as [string, string, string][];
  const hasDomains = domains.length > 0;

  // ── Reco fields ──
  const recoColors = [pat.color, "#1D4ED8", "#15803D"];
  const recs = [1, 2, 3].map((n) => ({
    n,
    title: get(`ai_rec_${n}_title`),
    target: get(`ai_rec_${n}_target`),
    why: get(`ai_rec_${n}_why`),
    how: get(`ai_rec_${n}_how`),
    timeFrame: get(`ai_rec_${n}_time_frame`),
    difficulty: get(`ai_rec_${n}_difficulty`),
    evidenceLevel: get(`ai_rec_${n}_evidence_level`),
    interventionId: get(`ai_rec_${n}_intervention_id`),
    color: recoColors[n - 1] ?? pat.color,
  }));
  const hasRecs = recs.some((r) => r.title);
  const hasFallbackRecs = get("action_1") || get("action_2") || get("action_3");

  // ── Breakdown bars ──
  const stressBreakdown: [string, string][] = [
    ["سنگینی مسئولیت‌ها", "stress_demand_100"],
    ["فشار ذهنی و نگرانی", "stress_appraisal_100"],
    ["نشانه‌های فشار", "stress_symptom_100"],
    ["اثر روی زندگی روزمره", "stress_function_100"],
    ["فشار ناشی از کمبود منابع", "stress_resource_depletion_100"],
    ["ریسک ادامه‌دار شدن", "stress_duration_100"],
  ];
  const burnoutBreakdown: [string, string][] = [
    ["خستگی فرسایشی", "burnout_exhaustion_100"],
    ["کمبود استراحت واقعی", "burnout_recovery_deficit_100"],
    ["اثر روی زندگی روزمره", "burnout_function_100"],
    ["ریسک ادامه‌دار شدن", "burnout_duration_100"],
    ["سنگینی مسئولیت‌ها", "burnout_demand_100"],
    ["تلاش زیاد، پاداش کم", "burnout_control_reward_100"],
  ];

  const showScores = stressLoadScore > 0 || burnoutRiskScore > 0;
  const hasDeeper = !!(aiDeeperTitle && aiDeeperText);

  const safeReflection = aiReflection?.trim()
    ? aiReflection
    : get("reflection")?.trim()
      ? get("reflection")
      : "کجا بیش از آنچه دریافت می‌کنید می‌بخشید؟ و چه چیزی می‌تواند این را متقابل‌تر، دیده‌شده‌تر یا پایدارتر کند؟";

  const heroBackground = `linear-gradient(160deg, ${pat.bg} 0%, #F7F5F1 60%)`;
  const dateRaw = get("created_at");
  const resultId = get("result_id (text)") || get("result_id");

  return (
    <div>
      {/* ── HERO ── */}
      <div style={{ background: heroBackground }}>
        <div className="r-hero-inner">
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 28,
            }}
          >
            <div className="r-hero-date">
              {dateRaw
                ? `ارزیابی · ${formatReportDate(dateRaw)}`
                : "ارزیابی استرس و تاب‌آوری"}
            </div>
            <div className="r-no-print" style={{ display: "flex", gap: 8 }}>
              <button className="r-btn-share" onClick={handleShare}>
                {copied ? "لینک کپی شد" : "اشتراک‌گذاری"}
              </button>
              <button className="r-btn-pdf" onClick={() => window.print()}>
                ذخیره به‌صورت PDF
              </button>
            </div>
          </div>

          {/* Pattern tag */}
          <div className="r-pattern-tag" style={{ background: pat.bg, color: pat.color }}>
            <span className="r-pattern-dot" style={{ background: pat.color }} />
            <span>
              {pat.label}
              {showSecondary ? ` · ${formatPattern(secondary)}` : ""}
            </span>
          </div>

          {/* Title */}
          <h1 className="r-hero-title r-serif">{heroTitle}</h1>
          <p className="r-hero-subtitle">{heroSubtitle}</p>

          {/* Meta chips */}
          <div className="r-hero-meta">
            {roleContext && (
              <span className="r-meta-chip">
                <span>نقش:</span>
                {roleContext}
              </span>
            )}
            {ageGroup && (
              <span className="r-meta-chip">
                <span>سن:</span>
                {formatAgeGroup(ageGroup)}
              </span>
            )}
            {safeGoal && (
              <span className="r-meta-chip">
                <span>هدف:</span>
                {safeGoal}
              </span>
            )}
            {rechargeDisplay &&
              (() => {
                const rechargeNum = safeNum(f["recharge_score"]);
                const isLowRecharge = rechargeNum > 0 && rechargeNum <= 2;
                return (
                  <span
                    className="r-meta-chip"
                    style={
                      isLowRecharge
                        ? {
                            background: "#FEF3C7",
                            borderColor: "#FCD34D",
                            color: "#92400E",
                            fontWeight: 600,
                          }
                        : {}
                    }
                  >
                    {isLowRecharge && <span style={{ marginLeft: 4 }}>⚠️</span>}
                    <span>استراحت و جبران انرژی:</span>
                    {rechargeDisplay}
                  </span>
                );
              })()}
            {!isUnclearOrInvalid &&
              (() => {
                const raw = (patternConfidenceFinal || aiConfidence).trim().toUpperCase();
                const clarityMap: Record<string, string> = {
                  HIGH: "بالا",
                  MEDIUM: "متوسط",
                  LOW: "پایین",
                  LOW_MIXED: "پایین — سیگنال‌های ترکیبی",
                  MIXED: "ترکیبی",
                  HIGH_SEVERITY: "تصویر شدت بالا",
                  RESOURCE_CRISIS: "تصویر تحلیل منابع",
                  HIGH_MAINTENANCE: "تصویر حفظ وضعیت",
                  MEDIUM_PREVENTION: "تمرکز پیشگیرانه",
                  // common Persian confidence values pass through:
                  بالا: "بالا",
                  متوسط: "متوسط",
                  پایین: "پایین",
                };
                const clarityLabel = clarityMap[raw] ?? (aiConfidence ? aiConfidence : null);
                if (!clarityLabel) return null;
                return (
                  <span className="r-meta-chip">
                    <span>وضوح الگو:</span>
                    {clarityLabel}
                  </span>
                );
              })()}
            {(() => {
              const pcl = patternClarityLevel.trim().toUpperCase();
              if (pcl === "HIGH_SEVERITY_MULTI_PATTERN")
                return (
                  <span
                    className="r-meta-chip"
                    style={{
                      background: "#FEF2F2",
                      borderColor: "#FCA5A5",
                      color: "#B91C1C",
                      fontWeight: 600,
                    }}
                  >
                    شدت بالا — چند سازوکار فعال
                  </span>
                );
              if (pcl === "RESOURCE_CRISIS_PATTERN")
                return (
                  <span
                    className="r-meta-chip"
                    style={{
                      background: "#FEF3C7",
                      borderColor: "#FCD34D",
                      color: "#92400E",
                      fontWeight: 600,
                    }}
                  >
                    فشار ناشی از کمبود منابع — محرک اصلی
                  </span>
                );
              return null;
            })()}
            {pressureSources && (
              <span className="r-meta-chip">
                <span>منبع فشار:</span>
                {pressureSources}
              </span>
            )}
          </div>

          {/* Top alert card */}
          {showTopAlert && topAlertText && (
            <div
              style={{
                background: "#FFFBEB",
                border: "1px solid #FCD34D",
                borderRight: "4px solid #F59E0B",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 20,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: "#78716C", lineHeight: 1.85 }}>
                <span style={{ marginLeft: 6 }}>⚠️</span>
                <strong style={{ color: "#92400E" }}>توجه: </strong>
                {topAlertText}
              </p>
            </div>
          )}

          {/* Score gauges */}
          {showScores && (
            <div className="r-scores-row">
              <div className="r-score-card">
                <div className="r-score-label"><Term label="میزان فشار فعلی" /></div>
                <div className="r-gauge-wrap">
                  <ArcGauge score={stressLoadScore} color={stressGaugeColor} />
                  <div className="r-gauge-text">
                    <span className="r-gauge-num r-serif">{stressLoadScore || "—"}</span>
                    <span className="r-gauge-level" style={{ color: stressGaugeColor }}>
                      {stressLoadLabel}
                    </span>
                    <span className="r-gauge-sub">از ۱۰۰</span>
                  </div>
                </div>
              </div>
              <div className="r-score-card">
                <div className="r-score-label"><Term label={burnoutDisplayName} /></div>
                <div className="r-gauge-wrap">
                  <ArcGauge score={burnoutRiskScore} color={burnoutGaugeColor} />
                  <div className="r-gauge-text">
                    <span className="r-gauge-num r-serif">{burnoutRiskScore || "—"}</span>
                    <span className="r-gauge-level" style={{ color: burnoutGaugeColor }}>
                      {burnoutRiskLabel}
                    </span>
                    <span className="r-gauge-sub">از ۱۰۰</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── QUALITY WARNING ── */}
      {hasQualityWarning && (
        <div style={{ maxWidth: 740, margin: "0 auto", padding: "28px 24px 0" }}>
          <QualityWarning
            level={responseQualityLevel}
            score={responseQualityScore}
            speedFlag={speedFlag}
            noStressContradiction={noStressContradiction}
          />
        </div>
      )}

      {/* ── SUMMARY ── */}
      <section className="r-section">
        <div className="r-container">
          <div className="r-eyebrow">خلاصه وضعیت شما</div>
          <h2 className="r-section-title r-serif">این نتیجه چه چیزی را نشان می‌دهد؟</h2>
          {mirrorSentence && (
            <p
              style={{
                fontSize: 17,
                fontStyle: "italic",
                color: "#1C1917",
                lineHeight: 1.85,
                marginBottom: 16,
                fontFamily: "Vazirmatn, Georgia, serif",
                fontWeight: 500,
              }}
            >
              {mirrorSentence}
            </p>
          )}
          {aiSummary && <p className="r-prose">{aiSummary}</p>}
          {analogyText && (
            <div className="r-loop-box" style={{ marginTop: 20 }}>
              <div className="r-loop-label">یک تصویر ساده برای فهم این الگو</div>
              <p className="r-loop-text" style={{ fontStyle: "normal" }}>
                {analogyText}
              </p>
            </div>
          )}
          {(aiFirstStep || !isLowStressMaintenance) && (
            <div
              className="r-highlight-box"
              style={{ background: pat.bg, borderRight: `3px solid ${pat.color}` }}
            >
              <div className="r-highlight-eyebrow" style={{ color: pat.color }}>
                از اینجا شروع کنید — ۲۴ تا ۴۸ ساعت آینده
              </div>
              <p>
                {firstNonEmpty(
                  aiFirstStep,
                  startHereText(
                    primary,
                    isLowStressMaintenance,
                    isLowStressWithGap,
                    isUnclearOrInvalid
                  )
                )}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── MECHANISM ── */}
      {(isLowValidity || aiMechanism || aiWhyItMatters || aiMaintenanceLoop) && (
        <section className="r-section">
          <div className="r-container">
            <div className="r-eyebrow">چرخه فشار</div>
            <h2 className="r-section-title r-serif">چه می‌شود و چرا مهم است؟</h2>
            {isLowValidity ? (
              <GatedNotice />
            ) : (
              <>
                {aiMechanism && <p className="r-prose">{aiMechanism}</p>}
                {aiWhyItMatters && (
                  <p className="r-prose" style={{ marginTop: 16 }}>
                    {aiWhyItMatters}
                  </p>
                )}
                {aiMaintenanceLoop && (
                  <div className="r-loop-box">
                    <div className="r-loop-label">این چرخه چگونه خود را پایدار نگه می‌دارد</div>
                    <p className="r-loop-text">{aiMaintenanceLoop}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ── NEEDS & RESOURCES ── */}
      {(isLowValidity || hasNeedData) && (
        <section className="r-section">
          <div className="r-container">
            <div className="r-eyebrow">نیازها و منابع شما</div>
            <h2 className="r-section-title r-serif">نیازها و منابع</h2>
            {isLowValidity ? (
              <GatedNotice />
            ) : (
              <>
                {aiMainNeedExplanation && <p className="r-prose">{aiMainNeedExplanation}</p>}
                {aiResourceInterpretation && (
                  <p className="r-prose" style={{ marginTop: 12 }}>
                    {aiResourceInterpretation}
                  </p>
                )}
                <div className="r-bar-grid" style={{ marginTop: 32 }}>
                  <div>
                    <div className="r-breakdown-title">
                      نیازهای کمتر تأمین‌شده &nbsp;
                      <span style={{ fontWeight: 400, opacity: 0.6 }}>عدد بالاتر یعنی نیاز بیشتر</span>
                    </div>
                    {needMap.map(([label, key]) => {
                      const v = safeNum(f[key]);
                      const color = needGapColor(v);
                      return <BarRow key={key} label={label} value={v} max={4} color={color} />;
                    })}
                  </div>
                  <div>
                    <div className="r-breakdown-title">
                      منابع حمایتی &nbsp;
                      <span style={{ fontWeight: 400, opacity: 0.6 }}>عدد پایین‌تر یعنی دسترسی کمتر</span>
                    </div>
                    {resMap.map(([label, key]) => {
                      const v = safeNum(f[key]);
                      const color = resourceBarColor(v);
                      return <BarRow key={key} label={label} value={v} max={5} color={color} />;
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── FUNCTIONAL IMPACT ── */}
      {hasDomains && !isLowValidity && shouldShowDailyExperience(f) && (
        <section className="r-section">
          <div className="r-container">
            <div className="r-eyebrow">تجربه‌ی روزمره</div>
            <h2 className="r-section-title r-serif">این الگو چگونه ممکن است بروز کند</h2>
            <div className="r-domains-grid">
              {domains.map(([icon, name, text]) => (
                <DomainCard key={name} icon={icon} name={name} text={text} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── LOW-STRESS MAINTENANCE BLOCK ── */}
      {!shouldShowDailyExperience(f) && isLowStressMaintenance && !isLowValidity && (
        <section className="r-section">
          <div className="r-container">
            <div className="r-eyebrow">کانون حفظ وضعیت</div>
            <h2 className="r-section-title r-serif">چه چیزی را محافظت کنیم</h2>
            <div
              className="r-highlight-box"
              style={{ background: "#F0FDF4", borderRight: "3px solid #15803D" }}
            >
              <p style={{ color: "#166534", lineHeight: 1.85 }}>
                چون بار استرس فعلی شما پایین است، مفیدترین کار جست‌وجوی مشکل نیست، بلکه محافظت از روال‌هایی است که شما را در تعادل نگه می‌دارند.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── RECOMMENDATIONS ── */}
      {(isLowValidity || hasRecs || hasFallbackRecs) && (
        <section className="r-section">
          <div className="r-container">
            <div className="r-eyebrow">پیشنهادهای عملی شما</div>
            <h2 className="r-section-title r-serif">سه قدم ساده و مبتنی بر شواهد</h2>
            {isLowValidity ? (
              <GatedNotice />
            ) : (
              <>
                {aiInterventionSummary && <p className="r-prose">{aiInterventionSummary}</p>}
                {hasRecs ? (
                  <div className="r-reco-stack">
                    {recs.map((r) => (
                      <RecoCard key={r.n} {...r} />
                    ))}
                  </div>
                ) : (
                  <div className="r-reco-stack">
                    {[get("action_1"), get("action_2"), get("action_3")]
                      .filter(Boolean)
                      .map((a, i) => (
                        <div
                          key={i}
                          style={{
                            background: "#fff",
                            border: "1px solid #E7E5E0",
                            borderRadius: 14,
                            padding: "20px 24px",
                            display: "flex",
                            gap: 14,
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: `${pat.color}18`,
                              color: pat.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "Vazirmatn, Georgia, serif",
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            {i + 1}
                          </div>
                          <div style={{ fontSize: 14, lineHeight: 1.85, color: "#57534E" }}>{a}</div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ── DEEPER CONTEXT ── */}
      {hasDeeper && !isLowValidity && (
        <section className="r-section">
          <div className="r-container">
            <div className="r-eyebrow">زمینه شخصی شما</div>
            <h2 className="r-section-title r-serif">{aiDeeperTitle}</h2>
            <div className="r-context-card">
              <p className="r-prose">{aiDeeperText}</p>
              {aiNarrativeFit && <p className="r-fit-note">{aiNarrativeFit}</p>}
            </div>
          </div>
        </section>
      )}

      {/* ── DURATION & BURNOUT ── */}
      {(isLowValidity || aiDurationNote) && (
        <section className="r-section">
          <div className="r-container">
            <div className="r-eyebrow">فشار در طول زمان</div>
            <h2 className="r-section-title r-serif">نگاه بلندمدت‌تر</h2>
            {isLowValidity ? (
              <GatedNotice />
            ) : (
              <>
                <p className="r-prose">{aiDurationNote}</p>
                <div className="r-breakdown-cols">
                  <div>
                    <div className="r-breakdown-title">اجزای فشار فعلی</div>
                    {stressBreakdown.map(([label, key]) => {
                      const v = safeNum(f[key]);
                      const color = v >= 70 ? "#B91C1C" : v >= 50 ? "#B45309" : "#6B7280";
                      return <BarRow key={key} label={label} value={v} max={100} color={color} />;
                    })}
                  </div>
                  <div>
                    <div className="r-breakdown-title">اجزای فشار طولانی‌مدت</div>
                    {burnoutBreakdown.map(([label, key]) => {
                      const v = safeNum(f[key]);
                      const color = v >= 70 ? "#7C3AED" : v >= 50 ? "#8B5CF6" : "#A8A29E";
                      return <BarRow key={key} label={label} value={v} max={100} color={color} />;
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── CLOSING STATEMENT ── */}
      {closingStatement && (
        <div style={{ maxWidth: 740, margin: "0 auto", padding: "0 24px" }}>
          <p
            style={{
              textAlign: "center",
              fontSize: 17,
              color: "#1C1917",
              lineHeight: 1.85,
              fontFamily: "Vazirmatn, Georgia, serif",
              fontWeight: 500,
              fontStyle: "italic",
              maxWidth: 540,
              margin: "0 auto",
              padding: "40px 0 0",
            }}
          >
            {closingStatement}
          </p>
        </div>
      )}

      {/* ── REFLECTION ── */}
      <section className="r-section">
        <div className="r-container">
          <div className="r-eyebrow">یک سؤال برای فکر کردن</div>
          <div className="r-reflection-box">
            <p className="r-reflection-q r-serif">{safeReflection}</p>
          </div>
          {aiCautionNote && (
            <div className="r-caution-box">
              <p className="r-caution-text">{aiCautionNote}</p>
            </div>
          )}
          {!aiCautionNote && (
            <div className="r-caution-box">
              <p className="r-caution-text">
                این یک تفسیر غیرکلینیکی از استرس و تاب‌آوری است، نه یک تشخیص. اگر استرس غیرقابل‌مدیریت به‌نظر می‌رسد یا به‌شدت بر زندگی روزمره اثر می‌گذارد، با یک متخصص واجد شرایط یا یک منبع حمایتی مورد اعتماد صحبت کنید.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <div className="r-footer">
        <div className="r-container">
          <div className="r-footer-inner">
            <div className="r-footer-id">
              {resultId ? `نتیجه ${resultId}` : ""}
              {resultId && dateRaw ? " · " : ""}
              {dateRaw ? formatReportDate(dateRaw) : ""}
            </div>
            <div className="r-footer-note">
              این گزارش یک خودارزیابی غیرتشخیصی استرس و تاب‌آوری است، نه ارزیابی پزشکی یا روان‌پزشکی.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
