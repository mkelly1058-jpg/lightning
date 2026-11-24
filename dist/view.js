import { due, today } from './seed.js';
import { admin, closed, fixtureFlags, get, overdue, ownerName, parent, taskBuckets, visible } from './model.js';
import { studentRecords } from './student.js';

const glyphs = {
  grid:'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
  day:'M6 3v3m12-3v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 10 2 2 4-4',
  tasks:'m3 6 1.5 1.5L7 5m3 1h11M3 12l1.5 1.5L7 11m3 1h11M3 18l1.5 1.5L7 17m3 1h11',
  calendar:'M6 3v4m12-4v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 8h2m4 0h2m-8 4h2',
  projects:'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
  trophy:'M8 21h8m-4-4v4M7 4h10v6a5 5 0 0 1-10 0Zm0 2H4v3a4 4 0 0 0 4 4m9-7h3v3a4 4 0 0 1-4 4',
  requests:'M4 4h16v13H9l-5 4V4Zm4 5h8m-8 4h5',
  file:'M6 3h8l5 5v13H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 0v6h5M8 13h8m-8 4h8',
  staff:'M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-4a4 4 0 0 1 0 8',
  pulse:'M2 12h4l3-7 4 14 4-7h5',
  search:'M21 21l-4.3-4.3m2.3-5.7a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  bell:'M18 8a6 6 0 1 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9Zm-8 12a2 2 0 0 0 4 0',
  down:'m6 9 6 6 6-6',
  right:'m9 6 6 6-6 6',
  left:'m15 6-6 6 6 6',
  plus:'M12 5v14M5 12h14',
  pin:'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  clock:'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  alert:'M12 9v4m0 4h.01M10 4 2 19a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1L14 4a2 2 0 0 0-4 0Z',
  check:'m5 12 4 4L19 6',
  target:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  flag:'M5 21V4m0 1c5-4 8 3 14-1v11c-6 4-9-3-14 1',
  x:'m6 6 12 12M18 6 6 18',
  external:'M14 3h7v7m0-7-9 9m8 1v7H4V4h7',
  download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
  filter:'M4 6h16M7 12h10m-7 6h4',
  list:'M7 5h14M7 12h14M7 19h14M3 5h.01M3 12h.01M3 19h.01',
  bolt:'m13 2-9 12h7l-1 8 10-12h-7l1-8Z',
  sparkle:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
  menu:'M4 6h16M4 12h16M4 18h16',
  history:'M3 11a9 9 0 1 1 2 7m-2-7V5m0 6h6m3-4v5l3 2',
  user:'M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2m-3-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  run:'M16 4h.01M4 19h5l3-5m-2-6 4-1 3 4h4M7 12l3-4m4 1-2 5 5 2 2 4',
  ball:'M3 12h18m-9-9v18m-6-3c2-1 3-3 3-6s-1-5-3-6m12 12c-2-1-3-3-3-6s1-5 3-6m6-6a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  swim:'M3 16c2 0 2-2 4-2s2 2 5 2 3-2 5-2 2 2 4 2M3 20c2 0 2-2 4-2s2 2 5 2 3-2 5-2 2 2 4 2m-15-8 5-5 4 2m1 3 2-2m1-5h.01'
};
export const icon = (name, size = 20) => '<svg class="icon" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(glyphs[name] || glyphs.flag)+'"/></svg>';
export const e = (value = '') => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const safeUrl = raw => { try { const url = new URL(raw); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
export const dateLabel = (value, options = {day:'numeric',month:'short'}) => {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? value+'T12:00:00Z' : value);
  return Number.isNaN(date.valueOf()) ? '—' : new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',...options}).format(date);
};
export const dateLong = value => dateLabel(value,{weekday:'long',month:'long',day:'numeric'});
export const stamp = value => dateLabel(value,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
export const money = value => new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR',maximumFractionDigits:2}).format(value || 0);
export const cssTag = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g,'-');
export const tag = (value, tone = value) => '<span class="tag '+cssTag(tone)+'">'+e(value)+'</span>';
export const action = (label, what, value = '', cls = '', symbol = '') => '<button type="button" class="btn '+cls+'" data-action="'+e(what)+'" data-value="'+e(value)+'">'+(symbol ? icon(symbol,17) : '')+e(label)+'</button>';
export const badge = (symbol, cls='') => '<span class="symbol '+cls+'">'+icon(symbol,19)+'</span>';
export const sportIcon = sport => ({ Athletics:'run', Swimming:'swim', Basketball:'ball', Football:'ball' }[sport] || 'flag');
export const brand = () => '<span class="brand-mark"><img src="./assets/bolt.svg" alt="" width="42" height="42"></span><span class="brand-copy"><strong>LIGHTNING</strong><small>PE HEADQUARTERS</small></span>';
export const nav = [
  ['day','My Day','day'],['tasks','Tasks','tasks'],['fixtures','Fixtures','calendar'],['projects','Projects','projects'],
  ['results','Results','trophy'],['requests','Requests','requests'],['documents','Documents','file'],
  ['overview','Overview','grid'],['staff','Staff','staff'],['health','System Health','pulse']
];
const headings = {
  tasks:['Tasks','Find work by deadline, status or area.'], fixtures:['Fixtures','Plan the schedule and check what each team needs.'],
  projects:['Projects & trips','Track milestones, decisions and readiness.'], results:['Results & recognition','Record outcomes and review recognition before release.'],
  requests:['Requests','Submit operational needs and follow their decisions.'], documents:['Documents','Find the authoritative department source for each document.'],
  overview:['Department overview','Review deadlines, blockers and decisions across the department.'],
  staff:['Staff & responsibilities','Manage demo access, assignments and department responsibilities.'],
  health:['System health','Review source quality, scheduled jobs and the audit trail.']
};
export function select(name, values, selected = '', label = name, cls = '') {
  return '<select class="'+e(cls)+'" name="'+e(name)+'" aria-label="'+e(label)+'">'+values.map(entry => {
    const [value,title] = Array.isArray(entry) ? entry : [entry,entry];
    return '<option value="'+e(value)+'"'+(value === selected ? ' selected' : '')+'>'+e(title)+'</option>';
  }).join('')+'</select>';
}
const search = () => '<button class="search-button" type="button" data-action="search">'+icon('search',18)+'<span>Search anything</span><kbd>/</kbd></button>';
export const blank = (title, note = '', symbol = 'check') => '<div class="empty">'+badge(symbol,'neutral')+'<strong>'+e(title)+'</strong>'+(note ? '<p>'+e(note)+'</p>' : '')+'</div>';
const navItem = (id, label, glyph, page) => '<a href="#'+id+'" class="nav-item'+(id===page?' selected':'')+'"'+(id===page?' aria-current="page"':'')+'>'+icon(glyph,19)+'<span>'+label+'</span></a>';

export function shell(content, db, actor, page, mobileOpen) {
  const user = get(db,'users',actor);
  const isAdmin = admin(db,actor);
  const unread = visible(db,'notifications',actor).filter(item => !item.read && (!item.snooze || item.snooze <= today())).length;
  return '<div class="shell"><aside class="sidebar '+(mobileOpen?'mobile-open':'')+'" aria-label="Workspace navigation">'+
    '<a class="brand" href="#day" aria-label="Lightning PE HQ home">'+brand()+'</a>'+
    '<nav><p class="nav-label">WORKSPACE</p>'+nav.slice(0,7).map(item=>navItem(...item,page)).join('')+
    (isAdmin ? '<p class="nav-label management">MANAGEMENT</p>'+nav.slice(7).map(item=>navItem(...item,page)).join('') : '')+
    '</nav><div class="sidebar-foot"><span class="workspace-sign">'+icon('bolt',16)+'</span><div><strong>PE Department</strong><small>Taylor’s International School</small></div></div></aside>'+
    '<div class="workspace"><header class="topbar"><div class="top-left"><button class="icon-btn mobile-menu" type="button" data-action="menu" aria-label="Toggle navigation" aria-expanded="'+mobileOpen+'">'+icon('menu')+'</button><span class="breadcrumb">Workspace <span>/</span> <strong>'+e(nav.find(row=>row[0]===page)?.[1] || 'My Day')+'</strong></span></div>'+
    '<div class="top-right">'+search()+'<a class="student-link" href="#student">'+icon('trophy',16)+'<span>Student view</span></a>'+
    '<button class="icon-btn bell" type="button" data-action="notifications" aria-label="Notifications'+(unread ? ', '+unread+' unread':'')+'">'+icon('bell',20)+(unread ? '<i></i>' : '')+'</button>'+
    '<button class="profile" type="button" data-action="profile" aria-label="Switch demo account"><span class="avatar">'+e(user.initials)+'</span><span class="profile-label"><strong>'+e(user.name)+'</strong><small>'+(isAdmin?'Administrator':'Staff member')+'</small></span>'+icon('down',15)+'</button></div></header>'+
    '<main id="main" class="main" tabindex="-1">'+content+'</main>'+
    '<nav class="mobile-nav" aria-label="Quick navigation">'+nav.slice(0,4).map(item=>navItem(...item,page)).join('')+'</nav></div></div>';
}

function metrics(items) {
  return '<div class="metrics">'+items.map(([label,value,symbol,tone,target,kind='bucket'])=>
    '<button class="metric" type="button" data-action="'+kind+'" data-value="'+e(target)+'">'+badge(symbol,tone)+'<span><strong>'+value+'</strong><small>'+e(label)+'</small></span>'+icon('right',16)+'</button>'
  ).join('')+'</div>';
}

function taskLine(task, db, actor, compact = false) {
  const related = parent(db,task.link);
  const supporting = task.supporting.includes(actor) && task.owner !== actor;
  return '<button type="button" class="task-row '+(compact?'compact':'')+'" data-action="detail" data-value="tasks:'+e(task.id)+'">'+
    '<span class="task-state '+(closed(task)?'finished':overdue(task)?'late':'')+'" aria-hidden="true">'+(closed(task)?icon('check',14):'')+'</span>'+
    '<span class="task-copy"><strong>'+e(task.title)+'</strong><span>'+e(task.next)+'</span><small>'+e(related?.title || task.area)+(supporting?' · Supporting':'')+'</small></span>'+
    '<span class="task-meta">'+tag(task.priority)+(compact ? '' : '<small class="'+(overdue(task)?'danger-text':'')+'">'+(task.due ? dateLabel(task.due) : 'Needs a date')+'</small>')+'</span>'+icon('right',16)+'</button>';
}

function fixtureLine(fixture) {
  return '<button class="fixture-row" type="button" data-action="detail" data-value="fixtures:'+e(fixture.id)+'"><span class="date-tile"><strong>'+dateLabel(fixture.date,{day:'numeric'})+'</strong><small>'+dateLabel(fixture.date,{month:'short'})+'</small></span>'+
    '<span class="fixture-copy"><strong>'+e(fixture.title)+'</strong><small>'+e(fixture.team)+' · '+e(fixture.sport)+'</small><small class="fixture-place">'+icon('pin',13)+e(fixture.venue || 'Venue to confirm')+'</small></span>'+icon('right',16)+'</button>';
}

export function dashboard(db, actor, state) {
  const user = get(db,'users',actor);
  const tasks = visible(db,'tasks',actor).filter(task=>!admin(db,actor) || task.owner===actor || task.supporting.includes(actor));
  const buckets = taskBuckets(tasks);
  const fixtures = db.fixtures.filter(item=>item.date>=today() && item.status!=='Cancelled').sort((a,b)=>a.date.localeCompare(b.date));
  const tab = state.dayTab || 'All tasks';
  const order = ['Overdue','Today','Next 7 days','Waiting','Needs a date','Upcoming'];
  const already = new Set();
  const groups = (tab === 'All tasks' ? order : [tab]).map(label => {
    const list = (buckets[label] || []).filter(item=>tab!=='All tasks' || !already.has(item.id));
    list.forEach(item=>already.add(item.id));
    return list.length ? '<div class="task-group"><div class="group-title"><span class="group-dot '+cssTag(label)+'"></span>'+e(label)+'<span class="group-count">'+list.length+'</span></div>'+list.map(task=>taskLine(task,db,actor)).join('')+'</div>' : '';
  }).join('');
  return '<section class="hero"><div class="hero-inner"><div class="hero-kicker">'+icon('calendar',15)+e(dateLong(today()))+'</div><h1>My Day<span>.</span></h1><p>Good '+greeting()+', '+e(user.name.split(' ')[0])+'. Here’s what’s on your plate.</p><div class="hero-actions">'+
    action('New task','new','tasks','primary','plus')+action('Raise a request','new','requests','on-dark','requests')+
    '</div></div></section>'+
    metrics([
      ['Overdue',buckets.Overdue.length,'alert','rose','Overdue','day-tab'],['Due today',buckets.Today.length,'target','ink','Today','day-tab'],
      ['Next 7 days',buckets['Next 7 days'].length,'calendar','blue','Next 7 days','day-tab'],['Waiting',buckets.Waiting.length,'clock','amber','Waiting','day-tab']
    ])+
    '<div class="dash-grid"><section class="panel work-panel"><header class="panel-head"><div><h2>My tasks</h2><p>Prioritise your next action.</p></div><a class="text-link" href="#tasks">View all tasks</a></header>'+
    '<div class="tabs" aria-label="Task buckets">'+['All tasks','Today','Next 7 days','Waiting','Needs a date'].map(label=>action(label,'day-tab',label,'tab '+(tab===label?'active':''))).join('')+'</div>'+
    (groups || blank('You’re all caught up','There are no tasks in this view.'))+'</section>'+
    '<div class="dash-side"><section class="panel fixture-panel"><header class="panel-head"><div><h2>Upcoming fixtures</h2><p>Coming up on the schedule.</p></div>'+badge('calendar','rose')+'</header>'+
    (fixtures.slice(0,3).map(fixtureLine).join('') || blank('No upcoming fixtures','Confirmed dates will appear here.','calendar'))+
    '<a class="panel-link" href="#fixtures">View fixture calendar'+icon('right',17)+'</a></section>'+
    '<section class="source-card"><div class="source-icon">'+icon('pulse',19)+'</div><div><strong>Manual source review</strong><p>'+(db.settings.verified ? 'Last verified '+dateLabel(db.settings.verified) : 'External sources are reviewed manually.')+'</p></div></section></div></div>';
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',hour:'numeric',hourCycle:'h23'}).format(new Date()));
  return hour<12?'morning':hour<18?'afternoon':'evening';
}
function pageHead(page, button = '') {
  const [title,sub] = headings[page];
  return '<header class="page-head"><div><h1>'+title+'</h1><p>'+sub+'</p></div>'+button+'</header>';
}
const panelTitle = (title, note='', side='') => '<header class="panel-head"><div><h2>'+e(title)+'</h2>'+(note?'<p>'+e(note)+'</p>':'')+'</div>'+side+'</header>';
export const fieldline = (title, value) => '<div><dt>'+e(title)+'</dt><dd>'+value+'</dd></div>';

export function overview(db) {
  const buckets = taskBuckets(db.tasks);
  const open = db.tasks.filter(row=>!closed(row));
  const requests = db.requests.filter(row=>['Submitted','Reviewing'].includes(row.status));
  const review = db.results.filter(row=>row.celebration==='In review');
  const reassignment = open.filter(row=>row.comments.some(note=>note.reassignment && String(note.time)>String(row.reassignmentResolved || '')));
  const decisions = requests.length + review.length + reassignment.length;
  const upcoming = db.fixtures.filter(row=>row.date>=today() && row.status!=='Cancelled').length;
  return pageHead('overview',action('New task','new','tasks','primary','plus'))+metrics([
    ['Overdue',buckets.Overdue.length,'alert','rose','Overdue'],['Due in 7 days',buckets.Today.length+buckets['Next 7 days'].length,'calendar','blue','Due in 7 days'],
    ['Waiting',buckets.Waiting.length,'clock','amber','Waiting'],['Unassigned',buckets.Unassigned.length,'user','ink','Unassigned'],
    ['Decisions',decisions,'flag','rose','decisions','jump'],['Upcoming fixtures',upcoming,'calendar','blue','upcoming','fixture-filter']
  ])+'<div class="dash-grid overview-grid"><section class="panel">'+panelTitle('Workload','Open responsibilities by owner and deadline.')+
  '<div class="table-wrap"><table><thead><tr><th>Staff</th><th>Owned</th><th>Supporting</th><th>Overdue</th><th>Due in 7 days</th></tr></thead><tbody>'+
  db.users.filter(user=>user.active).map(user=>{const owned=open.filter(task=>task.owner===user.id);return '<tr><td><button class="plain person" data-action="owner-filter" data-value="'+e(user.id)+'"><span class="avatar small">'+e(user.initials)+'</span>'+e(user.name)+'</button></td><td>'+owned.length+'</td><td>'+open.filter(task=>task.supporting.includes(user.id)).length+'</td><td>'+owned.filter(overdue).length+'</td><td>'+owned.filter(task=>task.due>=today()&&task.due<=due(7)).length+'</td></tr>';}).join('')+
  '</tbody></table></div></section><section class="panel" id="decisions" tabindex="-1">'+panelTitle('Decision queue',decisions+' items for review.')+
  ([...requests.map(row=>['requests',row,'Request']),...review.map(row=>['results',row,'Recognition']),...reassignment.map(row=>['tasks',row,'Reassignment'])].map(([type,row,label])=>recordLine(type,row,label,'Review','flag')).join('') || blank('No decisions waiting'))+'</section></div>';
}

export function taskPage(db, actor, state) {
  const group = state.taskFilter || 'Active';
  const all = visible(db,'tasks',actor);
  const buckets = taskBuckets(all);
  const opts = ['Active','Overdue','Today','Due in 7 days','Next 7 days','Waiting','Needs a date','Upcoming','Completed','Unassigned','All'];
  let rows = group==='Active' ? all.filter(row=>!closed(row)) : group==='All' ? all : group==='Due in 7 days' ? [...buckets.Today,...buckets['Next 7 days']] : buckets[group] || [];
  rows = rows.filter(row=>(!state.area || row.area===state.area)&&(!state.taskStatus||row.status===state.taskStatus)&&(!state.owner||row.owner===state.owner)&&(!state.from||row.due>=state.from)&&(!state.to||(row.due&&row.due<=state.to)));
  rows = [...rows].sort((a,b)=>(a.due || '9999').localeCompare(b.due || '9999'));
  return pageHead('tasks',action('New task','new','tasks','primary','plus'))+'<section class="panel">'+
    '<form class="filterbar" data-form="filters">'+icon('filter',18)+
    select('taskFilter',opts,group,'Task group')+select('area',[['','All areas'],...new Set(all.map(row=>row.area))],state.area,'Area')+
    select('taskStatus',[['','All statuses'],...new Set(all.map(row=>row.status))],state.taskStatus,'Status')+
    (admin(db,actor)?select('owner',[['','All owners'],...db.users.map(user=>[user.id,user.name])],state.owner,'Owner'):'')+
    '<label class="inline-field">From <input name="from" type="date" value="'+e(state.from)+'"></label><label class="inline-field">To <input name="to" type="date" value="'+e(state.to)+'"></label></form>'+
    '<div class="record-count">'+rows.length+' '+(rows.length===1?'task':'tasks')+'</div>'+
    (rows.length ? rows.map(row=>taskLine(row,db,actor)).join('') : blank('No matching tasks','Change the filters or create a new task.','tasks'))+'</section>';
}

function recordLine(type, record, description, status, symbol) {
  return '<button type="button" class="record-row" data-action="detail" data-value="'+e(type)+':'+e(record.id)+'">'+badge(symbol,'neutral')+
    '<span class="record-copy"><strong>'+e(record.title || record.name)+'</strong><small>'+e(description)+'</small></span>'+
    (status ? tag(status) : '')+icon('right',16)+'</button>';
}

export function fixturePage(db, actor, state) {
  const sport = [...new Set(db.fixtures.map(row=>row.sport))].sort();
  const teams = [...new Set(db.fixtures.map(row=>row.team))].sort();
  const rows = db.fixtures.filter(row=>(!state.sport || row.sport===state.sport)&&(!state.team||row.team===state.team)&&(!state.coach||[row.lead,...row.supporting].includes(state.coach))&&(!state.month||row.date.startsWith(state.month))&&(!state.upcoming||(row.date>=today()&&row.status!=='Cancelled'))&&(!state.missingLead||(!row.lead&&row.status!=='Cancelled'))).sort((a,b)=>a.date.localeCompare(b.date));
  const mode = state.fixtureMode || 'List';
  const current = state.month || today().slice(0,7);
  const previous = new Date(current+'-01T12:00:00Z');
  previous.setUTCMonth(previous.getUTCMonth()-1);
  const next = new Date(current+'-01T12:00:00Z');
  next.setUTCMonth(next.getUTCMonth()+1);
  return pageHead('fixtures',admin(db,actor)?action('New fixture','new','fixtures','primary','plus'):'')+'<section class="panel">'+
    '<div class="fixture-tools"><form class="filterbar" data-form="filters">'+icon('filter',18)+
    select('sport',[['','All sports'],...sport],state.sport,'Sport')+select('team',[['','All teams'],...teams],state.team,'Team')+
    select('coach',[['','All coaches'],...db.users.map(user=>[user.id,user.name])],state.coach,'Coach')+
    '<label class="inline-field">Month <input name="month" type="month" value="'+e(state.month)+'"></label>'+
    '<label class="inline-field"><input name="upcoming" type="checkbox"'+(state.upcoming?' checked':'')+'> Upcoming</label><label class="inline-field"><input name="missingLead" type="checkbox"'+(state.missingLead?' checked':'')+'> Missing lead</label></form>'+
    '<div class="switch">'+['List','Calendar'].map(label=>action(label,'fixture-mode',label,mode===label?'active':'',label==='List'?'list':'calendar')).join('')+'</div></div>'+
    (mode==='Calendar' ? '<div class="cal-head"><h2>'+dateLabel(current+'-01',{month:'long',year:'numeric'})+'</h2><div>'+action('Previous','month',previous.toISOString().slice(0,7),'outline')+action('Next','month',next.toISOString().slice(0,7),'outline')+'</div></div>'+calendar(rows,current) : rows.map(row=>{
      const flags=fixtureFlags(db,row);return '<button type="button" class="record-row" data-action="detail" data-value="fixtures:'+e(row.id)+'"><span class="date-tile"><strong>'+dateLabel(row.date,{day:'numeric'})+'</strong><small>'+dateLabel(row.date,{month:'short'})+'</small></span><span class="record-copy"><strong>'+e(row.title)+'</strong><small>'+e(row.sport)+' · '+e(row.team)+' · '+e(row.venue||'Venue to confirm')+'</small>'+(flags.length?'<small class="danger-text">'+e(flags.join(' · '))+'</small>':'')+'</span>'+tag(row.status)+icon('right',16)+'</button>';
    }).join('') || blank('No fixtures found','Try changing the filters.','calendar'))+'</section>';
}

function calendar(rows, month) {
  const start = new Date(month+'-01T12:00:00Z');
  const offset = (start.getUTCDay()+6)%7;
  const next = new Date(start);
  next.setUTCMonth(next.getUTCMonth()+1);
  const total = Math.round((next-start)/86400000);
  return '<div class="calendar-wrap"><div class="calendar-grid">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(label=>'<div class="weekday">'+label+'</div>').join('')+
    Array.from({length:Math.ceil((total+offset)/7)*7},(_,index)=>{
      const number=index-offset+1;
      if(number<1||number>total)return '<div class="cal-cell outside"></div>';
      const current=month+'-'+String(number).padStart(2,'0');
      return '<div class="cal-cell '+(current===today()?'current':'')+'"><span>'+number+'</span>'+rows.filter(item=>item.date===current).map(item=>action(item.title,'detail','fixtures:'+item.id,'cal-event')).join('')+'</div>';
    }).join('')+'</div></div>';
}

export function directory(db, actor, page) {
  const rows = visible(db,page,actor);
  const buttons = {
    projects:admin(db,actor)?action('New project','new','projects','primary','plus'):'',
    results:action('Record result','new','results','primary','plus'),
    requests:action('Raise a request','new','requests','primary','plus'),
    documents:admin(db,actor)?action('Add document','new','documents','primary','plus'):'',
    staff:action('Add demo account','new','staff','primary','plus')
  };
  if (page === 'staff') {
    return pageHead(page,buttons[page])+'<section class="panel">'+panelTitle('Department roster','Demo accounts. School invitations are managed outside this prototype.')+
      db.users.map(user=>recordLine('staff',user,user.responsibilities || user.email,user.active ? (user.role==='admin'?'Administrator':'Active') : 'Disabled','user')).join('')+'</section>';
  }
  const items = rows.map(row=>{
    if(page==='projects'){
      const required=row.milestones.filter(item=>item.mandatory&&!item.done).length;
      return recordLine(page,row,row.kind+' · '+ownerName(db,row.lead)+' · '+required+' mandatory open',row.status,'projects');
    }
    if(page==='requests')return recordLine(page,row,row.category+' · '+ownerName(db,row.requester),row.status,'requests');
    if(page==='results')return recordLine(page,row,row.outcome+' · '+(parent(db,row.link)?.title || 'Outcome'),row.celebration,'trophy');
    return recordLine(page,row,row.area+' · Review '+dateLabel(row.review),row.flag?'Link flagged':row.project?'Restricted':'Department','file');
  }).join('');
  return pageHead(page,buttons[page])+'<section class="panel">'+(items || blank('No records to show','New records will appear here.',page==='projects'?'projects':'file'))+'</section>';
}

export function health(db) {
  const quality = [
    ['Fixtures missing a lead',db.fixtures.filter(row=>!row.lead&&row.status!=='Cancelled').length,'fixture-filter','missing-lead'],
    ['Active tasks without an owner',db.tasks.filter(row=>!closed(row)&&!row.owner).length,'bucket','Unassigned'],
    ['Active tasks without a date',db.tasks.filter(row=>!closed(row)&&!row.due).length,'bucket','Needs a date'],
    ['Flagged document links',db.documents.filter(row=>row.flag).length,'navigate','documents']
  ];
  return pageHead('health',action('Preview import','import','','primary','plus'))+
  '<div class="dash-grid health-grid"><section class="panel">'+panelTitle('Data quality','Live checks on the invented dataset.')+
  quality.map(([label,count,kind,value])=>'<button class="record-row" data-action="'+kind+'" data-value="'+e(value)+'">'+badge('alert',count?'rose':'neutral')+'<span class="record-copy"><strong>'+label+'</strong></span><strong>'+count+'</strong>'+icon('right',16)+'</button>').join('')+'</section>'+
  '<section class="panel">'+panelTitle('Source register','Manual source review')+'<div class="panel-body"><p>Approved workbook baseline in the PRD</p><dl class="details">'+fieldline('Fixtures','44')+fieldline('Tasks','55')+fieldline('Missing leads','12')+fieldline('Last verified',e(db.settings.verified?dateLabel(db.settings.verified):'Pending'))+'</dl>'+
  '<div class="actions">'+action('Update verification','settings','','outline')+action('Preview sample','import','sample','outline')+'</div></div></section>'+
  '<section class="panel">'+panelTitle('Reminder jobs','Recurrence and in-app reminders.')+'<div class="panel-body">'+
  (db.settings.jobs.failed?'<p class="warning">'+e(db.settings.jobs.failed)+'</p>':'<p>'+e(db.settings.jobs.last ? 'Last run '+stamp(db.settings.jobs.last) : 'No jobs run yet.')+'</p>')+
  '<div class="actions">'+action(db.settings.jobs.failed?'Retry job':'Run jobs','job','','primary')+action('Simulate failure','job','fail','outline')+action('Templates','templates','','outline')+'</div></div></section>'+
  '<section class="panel">'+panelTitle('Data exports','Browser prototype snapshots.')+'<div class="panel-body"><div class="actions">'+
  action('Export CSV','export','','outline','download')+action('Download backup','backup','','outline','download')+action('Restore backup','restore','','outline','history')+'</div></div></section>'+
  '<section class="panel">'+panelTitle('Import history')+(db.imports.map(item=>'<div class="event-line"><strong>'+e(item.batch)+'</strong><small>'+stamp(item.time)+' · '+item.added+' added · '+item.rejected+' rejected · '+item.review+' to review</small></div>').join('') || blank('No committed batches','','history'))+'</section>'+
  '<section class="panel">'+panelTitle('Audit history','Most recent changes.')+
  (db.activity.slice(0,12).map(item=>'<div class="event-line"><strong>'+e(item.action)+'</strong><small>'+e(item.actor==='system'?'System':ownerName(db,item.actor))+' · '+stamp(item.time)+'</small>'+(item.description?'<p>'+e(item.description)+'</p>':'')+'</div>').join('') || blank('No changes recorded yet','','history'))+'</section></div>';
}

export function studentPage(page, filter = '') {
  const {events,results} = studentRecords();
  const onResults = page === 'student-results';
  const list = (onResults ? results : events).filter(record=>!filter || record.sport===filter);
  const spotlight = events[0];
  const sportLabels = [...new Set((onResults?results:events).map(item=>item.sport))];
  return '<div class="student-shell"><header class="student-top"><div class="student-top-inner"><a href="#student" class="brand" aria-label="Lightning student sports home">'+brand()+'</a>'+
    '<nav class="student-nav" aria-label="Student navigation"><a href="#student" '+(!onResults?'aria-current="page"':'')+'>Fixtures</a><a href="#student-results" '+(onResults?'aria-current="page"':'')+'>Results</a></nav><a class="staff-link" href="#day">'+icon('grid',16)+'<span>Staff workspace</span></a></div></header>'+
    '<main id="main" tabindex="-1"><section class="student-hero"><div class="student-hero-inner"><div class="hero-kicker">TAYLOR’S INTERNATIONAL SCHOOL PUCHONG</div><h1>Lightning<br>Sports<span>.</span></h1><p>Your fixture schedule and team results.</p><div class="hero-actions"><a class="btn primary" href="#student">'+icon('calendar',17)+'Fixtures</a><a class="btn on-dark" href="#student-results">'+icon('trophy',17)+'Results</a></div></div></section>'+
    '<div class="student-main"><div class="student-section-heading"><div><div class="section-kicker"><span></span> STUDENT SPORTS HUB</div><h2>'+(onResults?'Team results':'Upcoming fixtures')+'</h2></div><span class="demo-label">Demo schedule</span></div>'+
    (!onResults&&!filter ? '<div class="featured-fixture"><div class="featured-date"><strong>'+dateLabel(spotlight.date,{day:'numeric'})+'</strong><span>'+dateLabel(spotlight.date,{month:'long'})+'</span></div><div><span class="section-kicker">NEXT FIXTURE</span><h3>'+e(spotlight.title)+'</h3><p>'+icon('clock',16)+e(spotlight.time)+' <span>·</span> '+icon('pin',16)+e(spotlight.venue)+'</p></div>'+action('Fixture details','student-event',spotlight.id,'primary')+'</div>':'')+
    '<div class="student-filters" aria-label="Filter by sport">'+[['','All sports'],...sportLabels.map(sport=>[sport,sport])].map(([value,label])=>'<button type="button" class="btn outline '+(filter===value?'active':'')+'" data-action="student-filter" data-value="'+e(value)+'" aria-pressed="'+(filter===value)+'">'+e(label)+'</button>').join('')+'</div>'+
    '<div class="student-cards">'+list.map(record=>'<article class="student-card">'+badge(sportIcon(record.sport),'rose')+'<div class="sport-label">'+e(record.sport)+' · '+e(record.team)+'</div><h3>'+e(record.title)+'</h3>'+
    (onResults ? '<div class="outcome">'+e(record.outcome)+'</div><p>'+e(record.summary)+'</p><small>'+dateLabel(record.date)+'</small>' :
      '<p>'+icon('calendar',16)+e(dateLabel(record.date,{weekday:'short',day:'numeric',month:'short'}))+' · '+e(record.time)+'</p><p>'+icon('pin',16)+e(record.venue)+'</p>'+
      action('Fixture details','student-event',record.id,'outline'))+'</article>').join('')+'</div></div>'+
    '<footer class="student-footer"><span>Lightning PE HQ</span><span>Taylor’s International School Puchong</span></footer>'+
    '</main></div>';
}

export function sourceLink(url, label='Open evidence') {
  const link = safeUrl(url);
  return link ? '<a class="text-link external" href="'+e(link)+'" target="_blank" rel="noopener noreferrer">'+e(label)+icon('external',15)+'</a>' : '<span class="muted">No link supplied</span>';
}
