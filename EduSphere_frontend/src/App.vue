<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useHealthCheck } from './composables/useHealthCheck'

const language = ref('en')
const activePage = ref('dashboard')
const { databaseStatus, connectionError, checkDatabase } = useHealthCheck()

const copy = {
  en: {
    school: 'Smart School',
    workspace: 'MANAGEMENT PORTAL',
    dashboard: 'Dashboard',
    admissions: 'Admissions',
    students: 'Students',
    academics: 'Academic setup',
    teaching: 'Teaching',
    attendance: 'Attendance',
    assessments: 'Assessments & results',
    timetable: 'Timetable',
    records: 'Transfers & certificates',
    reports: 'Reports',
    administration: 'Administration',
    healthPage: 'System health',
    welcome: 'A clearer view of school life.',
    overview: 'Your school management workspace, designed around the academic year.',
    currentYear: 'CURRENT ACADEMIC YEAR',
    notConfigured: 'Not configured',
    database: 'Database connection',
    checking: 'Checking connection…',
    connected: 'Connected',
    disconnected: 'Not connected',
    retry: 'Retry connection',
    modules: 'Your workspaces',
    modulesDescription: 'Move between the core areas of the school system.',
    open: 'Open workspace',
    comingSoon: 'Workspace setup is in progress',
    comingSoonDescription: 'This area is defined in the system design and will be connected to the school database as its workflows are implemented.',
    setupHeading: 'A connected school, from admission to graduation.',
    setupDescription: 'Manage applications, academic records, attendance, and results in one secure place.',
    setupNote: 'Your database connection is checked live. Add your local database settings to the backend .env file to bring the system online.',
    studentsNote: 'Official student records and year-by-year enrollment history.',
    admissionsNote: 'Review applications, verify documents, and register approved students.',
    academicsNote: 'Configure academic years, terms, grades, sections, and subjects.',
    teachingNote: 'Manage teacher profiles, subject assignments, and class schedules.',
    attendanceNote: 'Record daily attendance for assigned sections and keep an auditable history.',
    assessmentsNote: 'Set grading schemes, capture marks, and publish approved results.',
    timetableNote: 'Build class schedules and prevent teacher, section, and room conflicts.',
    recordsNote: 'Process student transfers and issue verified certificates.',
    reportsNote: 'Prepare enrollment, attendance, and academic reports.',
    administrationNote: 'Manage access, system settings, audit history, and operations.',
    language: 'Language',
  },
  am: {
    school: 'ስማርት ትምህርት ቤት',
    workspace: 'የአስተዳደር ፖርታል',
    dashboard: 'ዳሽቦርድ',
    admissions: 'ምዝገባ',
    students: 'ተማሪዎች',
    academics: 'የትምህርት ዝግጅት',
    teaching: 'ማስተማር',
    attendance: 'ክትትል',
    assessments: 'ፈተናዎች እና ውጤቶች',
    timetable: 'የጊዜ ሰሌዳ',
    records: 'ዝውውር እና ሰርተፊኬቶች',
    reports: 'ሪፖርቶች',
    administration: 'አስተዳደር',
    healthPage: 'የስርዓት ጤና',
    welcome: 'የትምህርት ቤት ሕይወትን በግልጽ ይመልከቱ።',
    overview: 'በትምህርት ዘመኑ ላይ የተመሰረተ የትምህርት ቤት አስተዳደር መድረክ።',
    currentYear: 'የአሁኑ የትምህርት ዘመን',
    notConfigured: 'አልተዋቀረም',
    database: 'የዳታቤዝ ግንኙነት',
    checking: 'ግንኙነቱን በመፈተሽ ላይ…',
    connected: 'ተገናኝቷል',
    disconnected: 'አልተገናኘም',
    retry: 'ግንኙነቱን እንደገና ይፈትሹ',
    modules: 'የስራ ቦታዎች',
    modulesDescription: 'በትምህርት ቤቱ ዋና ዋና የስራ ክፍሎች መካከል ይንቀሳቀሱ።',
    open: 'ይክፈቱ',
    comingSoon: 'የዚህ ክፍል ዝግጅት በመካሄድ ላይ ነው',
    comingSoonDescription: 'ይህ ክፍል በስርዓቱ ንድፍ ውስጥ ተካቷል፤ የስራ ሂደቶቹ ሲተገበሩ ከዳታቤዙ ጋር ይገናኛል።',
    setupHeading: 'ከምዝገባ እስከ ምረቃ የተገናኘ ትምህርት ቤት።',
    setupDescription: 'ማመልከቻዎችን፣ የትምህርት መዝገቦችን፣ ክትትልን እና ውጤቶችን በአንድ ደህንነቱ በተጠበቀ ቦታ ያስተዳድሩ።',
    setupNote: 'የዳታቤዝ ግንኙነቱ በቀጥታ ይፈተሻል። ስርዓቱን ለማስኬድ በbackend .env ፋይል ውስጥ የአካባቢዎን የዳታቤዝ ቅንብር ያስገቡ።',
    studentsNote: 'ይፋዊ የተማሪ መዝገቦች እና የዓመት የምዝገባ ታሪክ።',
    admissionsNote: 'ማመልከቻዎችን ይገምግሙ፣ ሰነዶችን ያረጋግጡ እና የተፈቀዱ ተማሪዎችን ይመዝግቡ።',
    academicsNote: 'የትምህርት ዓመታትን፣ ወሰኖችን፣ ክፍሎችን እና ትምህርቶችን ያዋቅሩ።',
    teachingNote: 'የመምህራን መገለጫዎችን፣ የትምህርት ምደባዎችን እና የክፍል የጊዜ ሰሌዳዎችን ያስተዳድሩ።',
    attendanceNote: 'ለተመደቡ ክፍሎች ዕለታዊ ክትትልን ይመዝግቡ እና ታሪኩን ይጠብቁ።',
    assessmentsNote: 'የውጤት መርሃ ግብሮችን ያዘጋጁ፣ ነጥቦችን ያስገቡ እና የተፈቀዱ ውጤቶችን ያትሙ።',
    timetableNote: 'የክፍል የጊዜ ሰሌዳ ያዘጋጁ እና የመምህር፣ ክፍል እና ቦታ ግጭቶችን ይከላከሉ።',
    recordsNote: 'የተማሪ ዝውውርን ያስተናግዱ እና የተረጋገጡ ሰርተፊኬቶችን ይስጡ።',
    reportsNote: 'የምዝገባ፣ የክትትል እና የትምህርት ሪፖርቶችን ያዘጋጁ።',
    administrationNote: 'ፈቃዶችን፣ የስርዓት ቅንብሮችን፣ የኦዲት ታሪክን እና ስራዎችን ያስተዳድሩ።',
    language: 'ቋንቋ',
  },
}

const t = computed(() => copy[language.value])

watch(language, (value) => {
  document.documentElement.lang = value
}, { immediate: true })

const workspaces = [
  { id: 'admissions', icon: 'inbox', note: 'admissionsNote' },
  { id: 'students', icon: 'users', note: 'studentsNote' },
  { id: 'academics', icon: 'book', note: 'academicsNote' },
  { id: 'teaching', icon: 'chalkboard', note: 'teachingNote' },
  { id: 'attendance', icon: 'check', note: 'attendanceNote' },
  { id: 'assessments', icon: 'chart', note: 'assessmentsNote' },
  { id: 'timetable', icon: 'calendar', note: 'timetableNote' },
  { id: 'records', icon: 'file', note: 'recordsNote' },
  { id: 'reports', icon: 'report', note: 'reportsNote' },
  { id: 'administration', icon: 'settings', note: 'administrationNote' },
]

const selectedWorkspace = computed(() => workspaces.find((item) => item.id === activePage.value))

onMounted(checkDatabase)
</script>

<template>
  <div class="app-shell" :class="{ 'amharic-ui': language === 'am' }">
    <aside class="sidebar">
      <a class="brand" href="#" @click.prevent="activePage = 'dashboard'">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M5 11.5 16 5l11 6.5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13Z" stroke="currentColor" stroke-width="2" />
            <path d="M11 27V16h10v11M10 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </span>
        <span class="brand-copy">
          <strong>{{ t.school }}</strong>
          <small>{{ t.workspace }}</small>
        </span>
      </a>

      <div class="nav-caption">{{ t.workspace }}</div>
      <nav class="navigation" :aria-label="t.workspace">
        <button
          class="nav-item"
          :class="{ active: activePage === 'dashboard' }"
          @click="activePage = 'dashboard'"
        >
          <span class="nav-icon icon-home" aria-hidden="true"></span>
          <span>{{ t.dashboard }}</span>
        </button>
        <div class="nav-caption nav-caption-spaced">{{ t.modules }}</div>
        <button
          v-for="item in workspaces"
          :key="item.id"
          class="nav-item"
          :class="{ active: activePage === item.id }"
          @click="activePage = item.id"
        >
          <span class="nav-icon" :class="`icon-${item.icon}`" aria-hidden="true"></span>
          <span>{{ t[item.id] }}</span>
        </button>
        <RouterLink class="nav-item" to="/health">
          <span class="nav-icon icon-check" aria-hidden="true"></span>
          <span>{{ t.healthPage }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-bottom">
        <div class="language-label">{{ t.language }}</div>
        <div class="language-switch" role="group" :aria-label="t.language">
          <button :class="{ selected: language === 'en' }" @click="language = 'en'">EN</button>
          <button :class="{ selected: language === 'am' }" @click="language = 'am'">አማ</button>
        </div>
        <div class="sidebar-footnote">EduSphere · Grades 9–12</div>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="breadcrumb"><span>{{ t.school }}</span><span class="crumb-separator">/</span><strong>{{ selectedWorkspace ? t[activePage] : t.dashboard }}</strong></div>
        <button class="connection-pill" :class="`status-${databaseStatus}`" :title="connectionError" @click="checkDatabase">
          <span class="status-dot"></span>
          <span>{{ t.database }}: {{ t[databaseStatus] || t.disconnected }}</span>
          <span class="refresh-icon" aria-hidden="true">↻</span>
        </button>
      </header>

      <div class="page-container">
        <template v-if="activePage === 'dashboard'">
          <section class="welcome-row">
            <div class="welcome-copy">
              <div class="eyebrow">{{ t.workspace }}</div>
              <h1>{{ t.welcome }}</h1>
              <p>{{ t.overview }}</p>
            </div>
            <div class="year-card">
              <span class="year-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.7" /><path d="M7 3v4M17 3v4M3 10h18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" /></svg>
              </span>
              <span><small>{{ t.currentYear }}</small><strong>{{ t.notConfigured }}</strong></span>
            </div>
          </section>

          <section class="setup-banner">
            <div class="banner-art" aria-hidden="true">
              <span class="art-circle"></span>
              <svg viewBox="0 0 120 96" fill="none">
                <path d="m18 39 42-24 42 24v45H18V39Z" fill="#FFF" fill-opacity=".92" />
                <path d="m13 39 47-27 47 27M31 84V48h58v36M48 84V60h24v24" stroke="#7186D2" stroke-width="3" stroke-linejoin="round" />
                <path d="M44 47h8m16 0h8M37 57h6m34 0h6" stroke="#A3B1E4" stroke-width="3" stroke-linecap="round" />
                <path d="M57 25h6v12h-6z" fill="#F3C969" />
              </svg>
            </div>
            <div class="banner-copy">
              <span class="banner-kicker">EDUSPHERE</span>
              <h2>{{ t.setupHeading }}</h2>
              <p>{{ t.setupDescription }}</p>
              <div class="banner-footnote">
                <span class="info-mark">i</span>
                <span>{{ t.setupNote }}</span>
              </div>
            </div>
            <div class="banner-decoration decoration-one"></div>
            <div class="banner-decoration decoration-two"></div>
          </section>

          <section class="section-heading">
            <div>
              <h2>{{ t.modules }}</h2>
              <p>{{ t.modulesDescription }}</p>
            </div>
            <span class="module-count">10</span>
          </section>

          <section class="workspace-grid">
            <button
              v-for="item in workspaces"
              :key="item.id"
              class="workspace-card"
              @click="activePage = item.id"
            >
              <span class="workspace-icon" :class="`icon-${item.icon}`" aria-hidden="true"></span>
              <span class="workspace-title">{{ t[item.id] }}</span>
              <span class="workspace-note">{{ t[item.note] }}</span>
              <span class="workspace-open">{{ t.open }} <span aria-hidden="true">↗</span></span>
            </button>
          </section>
        </template>

        <section v-else class="module-empty-state">
          <span class="workspace-icon large-icon" :class="`icon-${selectedWorkspace?.icon || 'home'}`" aria-hidden="true"></span>
          <div class="eyebrow">{{ t.workspace }}</div>
          <h1>{{ t.comingSoon }}</h1>
          <p>{{ t.comingSoonDescription }}</p>
          <button class="back-button" @click="activePage = 'dashboard'">{{ t.dashboard }}</button>
        </section>
      </div>
    </main>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

:root {
  font-family: 'DM Sans', 'Noto Sans Ethiopic', sans-serif;
  color: #20283a;
  background: #f7f8fb;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  --sidebar: #17243b;
  --muted: #788296;
  --blue: #526bd5;
  --line: #e9ecf2;
}

* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; min-height: 100vh; }
button { font: inherit; }
.app-shell { min-height: 100vh; }
.sidebar { position: fixed; inset: 0 auto 0 0; z-index: 3; display: flex; flex-direction: column; width: 252px; padding: 28px 16px 18px; color: #cbd3e2; background: var(--sidebar); }
.brand { display: flex; align-items: center; gap: 12px; padding: 0 11px 33px; color: #fff; text-decoration: none; }
.brand-mark { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 12px; color: #fff; background: #6075de; box-shadow: 0 7px 18px #131c2f66; }
.brand-mark svg { width: 25px; height: 25px; }
.brand-copy { display: grid; gap: 4px; }
.brand-copy strong { font-family: Manrope, sans-serif; font-size: 15px; font-weight: 800; letter-spacing: -.3px; }
.brand-copy small,.nav-caption,.language-label,.sidebar-footnote { color: #8290a8; font-size: 9px; font-weight: 700; letter-spacing: 1.15px; }
.nav-caption { padding: 0 12px 10px; }
.nav-caption-spaced { padding-top: 26px; }
.navigation { min-height: 0; overflow-y: auto; }
.navigation::-webkit-scrollbar { width: 0; }
.nav-item { display: flex; align-items: center; width: 100%; gap: 13px; border: 0; border-radius: 8px; padding: 10px 12px; color: #aab5c8; background: transparent; text-align: left; font-size: 12px; cursor: pointer; transition: background .16s ease,color .16s ease; }
.nav-item:hover { color: #fff; background: #ffffff0d; }
.nav-item.active { color: #fff; background: #536bd5; box-shadow: 0 5px 12px #111c3540; }
.nav-icon { position: relative; display: inline-flex; flex: 0 0 16px; width: 16px; height: 16px; align-items: center; justify-content: center; opacity: .9; }
.nav-icon::before,.workspace-icon::before { font-size: 15px; font-weight: 500; line-height: 1; }
.icon-home::before { content: '⌂'; }
.icon-inbox::before { content: '▱'; }
.icon-users::before { content: '♙'; }
.icon-book::before { content: '▤'; }
.icon-chalkboard::before { content: '▣'; }
.icon-check::before { content: '✓'; }
.icon-chart::before { content: '▥'; }
.icon-calendar::before { content: '▦'; }
.icon-file::before { content: '▧'; }
.icon-report::before { content: '▤'; }
.icon-settings::before { content: '⚙'; }
.sidebar-bottom { margin-top: auto; padding: 18px 10px 0; border-top: 1px solid #ffffff15; }
.language-label { padding: 0 3px 9px; }
.language-switch { display: flex; width: fit-content; gap: 3px; padding: 3px; border: 1px solid #ffffff17; border-radius: 7px; background: #111d32; }
.language-switch button { min-width: 39px; border: 0; border-radius: 5px; padding: 5px 7px; color: #aeb9ca; background: transparent; font-size: 10px; cursor: pointer; }
.language-switch button.selected { color: #fff; background: #536bd5; }
.sidebar-footnote { padding: 16px 3px 0; font-size: 9px; letter-spacing: .3px; }
.main-content { min-height: 100vh; margin-left: 252px; }
.topbar { position: sticky; top: 0; z-index: 2; display: flex; height: 68px; align-items: center; justify-content: space-between; gap: 12px; padding: 0 42px; border-bottom: 1px solid #e8ebf1; background: #ffffffed; backdrop-filter: blur(12px); }
.breadcrumb { display: flex; align-items: center; gap: 11px; color: #8a93a3; font-size: 11px; }
.breadcrumb strong { color: #2b3447; font-weight: 600; }
.crumb-separator { color: #c8cdd7; }
.connection-pill { display: flex; align-items: center; gap: 8px; border: 1px solid #e8ebf0; border-radius: 20px; padding: 7px 10px; color: #707a8b; background: #fff; font-size: 10px; cursor: pointer; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #d3a33c; }
.status-connected .status-dot { background: #45ac80; box-shadow: 0 0 0 3px #45ac801a; }
.status-disconnected .status-dot { background: #d16d69; }
.refresh-icon { padding-left: 2px; color: #8b95a5; font-size: 15px; }
.page-container { max-width: 1370px; margin: 0 auto; padding: 37px 42px 60px; }
.welcome-row { display: flex; align-items: center; justify-content: space-between; gap: 22px; margin-bottom: 26px; }
.eyebrow { color: #6277d3; font-size: 9px; font-weight: 700; letter-spacing: 1.25px; }
h1,h2,p { margin-top: 0; }
.welcome-copy h1 { margin: 10px 0 7px; color: #20283a; font-family: Manrope, sans-serif; font-size: clamp(24px, 3vw, 33px); font-weight: 800; letter-spacing: -1.1px; }
.welcome-copy p,.section-heading p { margin-bottom: 0; color: #7d8798; font-size: 12px; }
.year-card { display: flex; flex: 0 0 auto; align-items: center; gap: 12px; min-width: 192px; padding: 13px 15px; border: 1px solid #eaedf3; border-radius: 9px; background: #fff; }
.year-icon { display: grid; width: 33px; height: 33px; place-items: center; border-radius: 8px; color: #596fd0; background: #f0f2ff; }
.year-icon svg { width: 18px; }
.year-card span:last-child { display: grid; gap: 4px; }
.year-card small { color: #929bac; font-size: 8px; font-weight: 700; letter-spacing: .65px; }
.year-card strong { color: #3b4454; font-size: 11px; font-weight: 600; }
.setup-banner { position: relative; display: flex; min-height: 204px; align-items: center; gap: 30px; overflow: hidden; margin-bottom: 33px; border: 1px solid #e8eafd; border-radius: 12px; padding: 25px 31px; background: linear-gradient(108deg,#f0f2ff 0%,#f6f7ff 55%,#f5f0ff 100%); }
.banner-art { position: relative; display: grid; flex: 0 0 152px; height: 147px; place-items: center; }
.banner-art svg { position: relative; z-index: 1; width: 120px; }
.art-circle { position: absolute; width: 132px; height: 132px; border: 1px solid #dfe3fb; border-radius: 50%; background: #e9ecfd; }
.banner-copy { position: relative; z-index: 1; max-width: 590px; }
.banner-kicker { color: #6478d4; font-size: 8px; font-weight: 800; letter-spacing: 1.4px; }
.banner-copy h2 { margin: 8px 0 5px; color: #273149; font-family: Manrope, sans-serif; font-size: 18px; font-weight: 800; letter-spacing: -.45px; }
.banner-copy > p { margin-bottom: 15px; color: #727d92; font-size: 11px; line-height: 1.6; }
.banner-footnote { display: flex; align-items: flex-start; gap: 8px; max-width: 650px; color: #747e92; font-size: 9px; line-height: 1.55; }
.info-mark { display: grid; flex: 0 0 14px; width: 14px; height: 14px; place-items: center; border: 1px solid #909bd3; border-radius: 50%; color: #6578cd; font-family: Georgia,serif; font-size: 10px; font-weight: 700; }
.banner-decoration { position: absolute; width: 108px; height: 108px; border: 1px solid #dfe3fb; border-radius: 50%; }
.decoration-one { top: -66px; right: 7%; }
.decoration-two { right: 2%; bottom: -76px; width: 160px; height: 160px; }
.section-heading { display: flex; align-items: center; justify-content: space-between; margin: 0 1px 15px; }
.section-heading h2 { margin: 0 0 5px; color: #283146; font-family: Manrope, sans-serif; font-size: 15px; font-weight: 800; }
.section-heading p { font-size: 10px; }
.module-count { display: grid; width: 24px; height: 24px; place-items: center; border-radius: 7px; color: #6678c8; background: #ecefff; font-size: 10px; font-weight: 700; }
.workspace-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; }
.workspace-card { position: relative; display: flex; min-height: 157px; flex-direction: column; align-items: flex-start; border: 1px solid #e9ecf2; border-radius: 9px; padding: 15px 16px 13px; background: #fff; text-align: left; cursor: pointer; transition: transform .16s ease,border-color .16s ease,box-shadow .16s ease; }
.workspace-card:hover { transform: translateY(-2px); border-color: #cfd6f6; box-shadow: 0 8px 20px #2b3b6710; }
.workspace-icon { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 8px; color: #596fd0; background: #f0f2ff; }
.workspace-icon::before { font-size: 18px; }
.workspace-title { margin-top: 11px; color: #30394b; font-size: 11px; font-weight: 700; }
.workspace-note { margin-top: 5px; color: #8590a1; font-size: 9px; line-height: 1.5; }
.workspace-open { display: flex; align-items: center; gap: 5px; margin-top: auto; padding-top: 11px; color: #6276ce; font-size: 9px; font-weight: 700; }
.module-empty-state { display: flex; min-height: 60vh; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.large-icon { width: 55px; height: 55px; margin-bottom: 21px; border-radius: 14px; }
.large-icon::before { font-size: 26px; }
.module-empty-state h1 { margin: 11px 0 8px; color: #20283a; font-family: Manrope,sans-serif; font-size: 26px; font-weight: 800; letter-spacing: -.7px; }
.module-empty-state p { max-width: 420px; color: #788296; font-size: 12px; line-height: 1.7; }
.back-button { margin-top: 8px; border: 0; border-radius: 7px; padding: 10px 16px; color: #fff; background: #526bd5; font-size: 11px; cursor: pointer; }
.amharic-ui { font-family: 'Noto Sans Ethiopic','DM Sans',sans-serif; }
.amharic-ui h1,.amharic-ui h2 { font-family: 'Noto Sans Ethiopic','DM Sans',sans-serif; letter-spacing: 0; }
@media (max-width: 1050px) {
  .sidebar { width: 220px; }
  .main-content { margin-left: 220px; }
  .page-container { padding-right: 27px; padding-left: 27px; }
  .topbar { padding-right: 27px; padding-left: 27px; }
  .workspace-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (max-width: 700px) {
  .sidebar { position: static; width: 100%; padding: 14px 14px 10px; }
  .brand { padding: 0 4px 14px; }
  .sidebar .nav-caption,.sidebar-bottom { display: none; }
  .navigation { display: flex; gap: 5px; overflow-x: auto; }
  .nav-item { width: auto; flex: 0 0 auto; gap: 7px; padding: 9px; font-size: 10px; }
  .nav-item:first-child { margin-right: 4px; }
  .main-content { margin-left: 0; }
  .topbar { position: static; height: 55px; padding: 0 17px; }
  .breadcrumb { font-size: 10px; }
  .connection-pill { max-width: 165px; gap: 6px; overflow: hidden; font-size: 9px; white-space: nowrap; }
  .page-container { padding: 24px 17px 40px; }
  .welcome-row { align-items: flex-start; flex-direction: column; }
  .welcome-copy h1 { font-size: 26px; }
  .year-card { min-width: 100%; }
  .setup-banner { gap: 10px; min-height: 0; padding: 20px 17px; }
  .banner-art { flex-basis: 80px; height: 105px; }
  .banner-art svg { width: 86px; }
  .art-circle { width: 86px; height: 86px; }
  .banner-copy h2 { font-size: 15px; }
  .workspace-grid { grid-template-columns: 1fr; }
  .workspace-card { min-height: 145px; }
}
</style>
