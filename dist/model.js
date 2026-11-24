import { seed, today, due, shift, iso, makeId, fixtureSteps, tripSteps, statusList, priorities, fixtureStates, projectStates, requestStates } from './seed.js';

export const storageKey = 'lightning-pe-hq-v1';
export const collections = ['users','tasks','fixtures','projects','results','requests','documents','templates','notifications','activity','imports'];
export const closed = task => ['Done','Cancelled'].includes(task.status);
export const dueWeek = task => !closed(task) && task.due && task.due >= today() && task.due <= due(7);
export const overdue = task => Boolean(!closed(task) && task.due && task.due < today());
export const admin = (db, actor) => db.users.some(user => user.id === actor && user.active && user.role === 'admin');
export const member = (project, actor) => Boolean(project && [project.lead, ...project.members].includes(actor));
export const get = (db, type, id) => db[type].find(record => record.id === id);
export const parent = (db, id) => get(db,'fixtures',id) || get(db,'projects',id);
export const ownerName = (db, id) => get(db,'users',id)?.name || 'Unassigned';
export const text = value => String(value ?? '').trim();
const validDate = value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value);
const int = (value, fallback) => Number.isInteger(Number(value)) && text(value) ? Number(value) : fallback;
const hasRole = (db, id) => db.users.some(user => user.id === id && user.active);
const within = (value, options) => options.includes(value);
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
const list = values => [...new Set(Array.isArray(values) ? values : values ? [values] : [])];

export function restore(raw) {
  ensure(raw && raw.schema === 1 && Number.isInteger(raw.revision) && collections.every(key => Array.isArray(raw[key])) && raw.settings?.jobs, 'This is not a valid Lightning PE HQ backup.');
  for (const key of collections) {
    const ids = raw[key].map(record => record?.id);
    ensure(ids.every(id => typeof id === 'string' && id) && new Set(ids).size === ids.length, 'Backup contains repeated or missing record IDs.');
  }
  const users = new Set(raw.users.map(user => user.id));
  const fixtures = new Set(raw.fixtures.map(item => item.id));
  const projects = new Set(raw.projects.map(item => item.id));
  ensure(raw.users.some(user => user.active && user.role === 'admin'), 'A backup must retain an active administrator.');
  ensure(raw.tasks.every(task => Array.isArray(task.supporting) && Array.isArray(task.comments) && within(task.status,statusList) && (!task.owner || users.has(task.owner)) && task.supporting.every(id => users.has(id)) && (!task.link || fixtures.has(task.link) || projects.has(task.link))), 'Backup contains invalid linked task records.');
  ensure(raw.projects.every(project => Array.isArray(project.members) && Array.isArray(project.milestones) && Array.isArray(project.decisions) && Array.isArray(project.payments) && users.has(project.lead) && project.members.every(id => users.has(id))), 'Backup contains invalid project records.');
  ensure(raw.fixtures.every(fixture => Array.isArray(fixture.supporting) && (!fixture.lead || users.has(fixture.lead)) && fixture.supporting.every(id => users.has(id))), 'Backup contains invalid fixture records.');
  return structuredClone(raw);
}

export function load(storage) {
  try {
    const raw = storage.getItem(storageKey);
    return raw ? restore(JSON.parse(raw)) : seed();
  } catch {
    return seed();
  }
}

export function visible(db, type, actor) {
  if (!hasRole(db,actor)) return [];
  if (admin(db, actor)) return db[type];
  const accessible = id => !id || Boolean(get(db,'fixtures',id)) || member(get(db,'projects',id),actor);
  switch (type) {
    case 'tasks': return db.tasks.filter(task => accessible(task.link) && [task.owner,...task.supporting].includes(actor));
    case 'fixtures': return db.fixtures;
    case 'projects': return db.projects.filter(project => member(project,actor));
    case 'requests': return db.requests.filter(request => request.requester === actor);
    case 'documents': return db.documents.filter(doc => accessible(doc.project));
    case 'results': return db.results.filter(result => accessible(result.link) && (!result.reference || result.author === actor || parent(db,result.link)?.lead === actor));
    case 'notifications': return db.notifications.filter(note => note.user === actor);
    default: return [];
  }
}

export function activity(db, actor, record, action, description = '') {
  db.activity.unshift({ id:makeId('a'), actor, record, action, description, time:iso() });
}

export function notify(db, user, key, title, record = '') {
  if (!user || !hasRole(db,user) || db.notifications.some(item => item.user === user && item.key === key)) return;
  db.notifications.unshift({ id:makeId('n'), user, key, title, record, created:iso(), read:false, snooze:'' });
}

export function taskBuckets(tasks) {
  const active = tasks.filter(task => !closed(task));
  return {
    'Overdue':active.filter(overdue),
    'Today':active.filter(task => task.due === today()),
    'Next 7 days':active.filter(task => task.due > today() && task.due <= due(7)),
    'Waiting':active.filter(task => task.status === 'Waiting'),
    'Needs a date':active.filter(task => !task.due),
    'Upcoming':active.filter(task => task.due > due(7)),
    'Completed':tasks.filter(closed),
    'Unassigned':active.filter(task => !task.owner)
  };
}

export function saveTask(db, actor, input, id = '', version = 0) {
  const previous = get(db,'tasks',id);
  const isAdmin = admin(db,actor);
  ensure(hasRole(db,actor) && (!id || previous), 'This task is unavailable.');
  ensure(!previous || isAdmin || previous.owner === actor, 'Only the task owner or administrator can make this change.');
  ensure(!previous || previous.version === version, 'This task changed in another view. Close and reopen it to load the latest version.');
  const owner = isAdmin ? text(input.owner) : previous?.owner || actor;
  const supporting = isAdmin ? list(input.supporting).filter(person => person !== owner) : previous?.supporting || [];
  const link = isAdmin ? text(input.link) : previous?.link || '';
  const linked = parent(db,link);
  const status = text(input.status) || 'To do';
  const basis = input.basis === 'Fixture relative' && linked && get(db,'fixtures',link) ? 'Fixture relative' : 'Fixed';
  const offset = int(input.offset,db.settings.prep);
  const deadline = basis === 'Fixture relative' ? shift(linked.date,-offset) : text(input.due);
  const changedDue = previous && previous.due !== deadline;
  const checklistDue = text(input.dueReason);
  const inherit = isAdmin ? input.inherit === 'on' && Boolean(get(db,'fixtures',link)) : Boolean(previous?.inherit);
  ensure(text(input.title) && text(input.area) && text(input.next), 'Enter a title, area and next action.');
  ensure(within(input.priority,priorities) && within(status,statusList), 'Select a valid priority and status.');
  ensure(!link || linked, 'Select an existing linked record.');
  ensure(!owner || hasRole(db,owner) || owner === previous?.owner, 'Select an active owner.');
  ensure(supporting.every(person => hasRole(db,person) || previous?.supporting.includes(person)), 'Select active supporting staff.');
  const project = get(db,'projects',link);
  ensure(!project || [owner,...supporting].filter(Boolean).every(person => member(project,person) || admin(db,person)), 'The owner and supporting staff must belong to the project.');
  ensure(owner || isAdmin, 'Assign an accountable owner.');
  ensure(!inherit || linked.lead === owner, 'An inherited owner must match the fixture lead.');
  ensure(validDate(deadline) && validDate(text(input.chase)), 'Enter a valid date.');
  ensure(deadline || text(input.undated), 'Enter a due date or a reason why it has no date.');
  ensure(!changedDue || checklistDue, 'Enter a reason for the date change.');
  ensure(status !== 'Waiting' || (text(input.waiting) && text(input.chase)), 'Waiting requires a waiting party and chase date.');
  ensure(status !== 'Done' || (text(input.completion) && (!previous?.requiresEvidence || text(input.evidence))), 'Completion requires a note and any required evidence.');
  ensure(status !== 'Cancelled' || ((isAdmin || previous?.personal || !previous) && text(input.cancel)), 'Cancellation requires a reason and administrator approval for department tasks.');
  ensure(status !== 'Needs review' || (text(input.reviewReason) && hasRole(db,text(input.reviewer) || previous?.reviewer || actor)), 'Enter a review reason and active reviewer.');
  ensure(previous?.status !== 'Needs review' || status === 'Needs review' || text(input.reviewResolution), 'Record how the review was resolved.');
  const next = {
    ...previous, id:previous?.id || makeId('t'), title:text(input.title), next:text(input.next), area:text(input.area),
    priority:input.priority, owner, supporting, link, status, basis, offset, due:deadline, inherit,
    undated:text(input.undated), waiting:text(input.waiting), chase:text(input.chase), completion:text(input.completion),
    cancel:text(input.cancel), evidence:text(input.evidence), reviewReason:text(input.reviewReason),
    reviewer:text(input.reviewer) || previous?.reviewer || actor, reviewResolution:text(input.reviewResolution),
    personal:previous?.personal ?? !isAdmin, version:(previous?.version || 0)+1,
    created:previous?.created || iso(), updated:iso(), editor:actor,
    completed:status === 'Done' ? previous?.completed || iso() : '', comments:previous?.comments || []
  };
  const action = !previous ? 'Task created' : previous.status === status ? 'Task updated' : 'Task marked ' + status.toLowerCase();
  const notes = [
    changedDue && 'Due date ' + (previous.due || 'undated') + ' → ' + (deadline || 'undated') + '. ' + checklistDue,
    previous?.status !== status && status === 'Done' && next.completion,
    previous?.status !== status && status === 'Cancelled' && next.cancel,
    previous?.status === 'Needs review' && status !== 'Needs review' && next.reviewResolution
  ].filter(Boolean).join(' ');
  replace(db.tasks,next);
  activity(db,actor,next.id,action,notes);
  if (owner && owner !== actor && status !== 'Needs review' && (owner !== previous?.owner || previous?.status === 'Needs review')) notify(db,owner,'assign:' + next.id + ':' + next.version,'Task assigned to you',next.id);
  return next;
}

export function replace(records, next) {
  const index = records.findIndex(record => record.id === next.id);
  if (index < 0) records.unshift(next);
  else records[index] = next;
}

export function taskComment(db, actor, id, value, reassignment = false) {
  const task = visible(db,'tasks',actor).find(record => record.id === id);
  ensure(task && text(value), 'Enter a note.');
  task.comments.push({actor,text:text(value),time:iso(),reassignment});
  task.version++;
  task.updated = iso();
  task.editor = actor;
  activity(db,actor,id,reassignment ? 'Reassignment requested' : 'Progress note added');
  if (reassignment) db.users.filter(user => user.active && user.role === 'admin').forEach(user => notify(db,user.id,'reassign:' + id + ':' + task.version,'Task reassignment requested',id));
}

export function fixtureFlags(db, fixture) {
  if (fixture.status === 'Cancelled') return [];
  const flags = [];
  if (!fixture.lead) flags.push('Missing lead');
  if (!fixture.reviewed) flags.push('Needs review');
  if (fixture.conflict) flags.push('Source conflict');
  if (fixture.weekday && fixture.date && new Intl.DateTimeFormat('en',{weekday:'long',timeZone:'UTC'}).format(new Date(fixture.date+'T12:00:00Z')) !== fixture.weekday) flags.push('Date and weekday mismatch');
  if (!fixture.venue || !fixture.meeting || !fixture.start || ['Unknown','Requested'].includes(fixture.transport)) flags.push('Incomplete logistics');
  const coaches = [fixture.lead,...fixture.supporting].filter(Boolean);
  for (const other of db.fixtures) {
    if (other.id === fixture.id || other.date !== fixture.date || other.status === 'Cancelled') continue;
    if (![other.lead,...other.supporting].some(person => coaches.includes(person))) continue;
    if (![fixture.start,fixture.end,other.start,other.end].every(Boolean)) flags.push('Same-day booking to review');
    else if (fixture.start < other.end && other.start < fixture.end) flags.push('Coach schedule clash');
  }
  return [...new Set(flags)];
}

export function saveFixture(db, actor, input, id = '') {
  const previous = get(db,'fixtures',id);
  const isAdmin = admin(db,actor);
  ensure(isAdmin || (previous && previous.lead === actor && hasRole(db,actor)), 'Only the fixture lead or administrator can edit logistics.');
  ensure(!id || previous, 'Fixture unavailable.');
  ensure(text(input.title) && text(input.sport) && text(input.team) && text(input.date) && text(input.next) && validDate(text(input.date)), 'Enter fixture details, next action and a valid date.');
  ensure(!input.start || !input.end || input.start < input.end, 'End time must be after the start time.');
  const lead = isAdmin ? text(input.lead) : previous.lead;
  const supporting = isAdmin ? list(input.supporting).filter(person => person !== lead) : previous.supporting;
  const status = isAdmin ? input.status : previous.status;
  const reviewed = isAdmin ? input.reviewed === 'on' : previous.reviewed;
  ensure(within(status,fixtureStates) && (!lead || hasRole(db,lead) || lead === previous?.lead) && supporting.every(person => hasRole(db,person) || previous?.supporting.includes(person)), 'Select valid staff and fixture status.');
  ensure(!isAdmin || status !== 'Confirmed' || (lead && reviewed), 'A confirmed fixture requires a lead and completed review.');
  ensure(status !== 'Cancelled' || previous?.status === 'Cancelled' || (text(input.cancelReason) && within(input.linkedAction,['retain','cancel'])), 'Enter a cancellation reason and choose how to handle linked tasks.');
  const next = {
    ...previous, id:previous?.id || makeId('f'), title:text(input.title), sport:text(input.sport), team:text(input.team), date:text(input.date),
    venue:text(input.venue), start:text(input.start), end:text(input.end), lead,supporting,status,reviewed,next:text(input.next),
    competition:text(input.competition), opponent:text(input.opponent), meeting:text(input.meeting), meetingTime:text(input.meetingTime),
    transport:text(input.transport), participants:Math.max(0,int(input.participants,0)),
    conflict:isAdmin ? text(input.conflict) : previous.conflict, weekday:isAdmin ? text(input.weekday) : previous.weekday,
    source:isAdmin ? text(input.source) || 'Manual source review' : previous.source, updated:iso()
  };
  replace(db.fixtures,next);
  activity(db,actor,next.id,previous ? 'Fixture updated' : 'Fixture created',text(input.cancelReason));
  if (!previous) return next;
  const hasMaterialChange = ['date','lead','venue','start','end','meeting','meetingTime','transport','status'].some(field => next[field] !== previous[field]);
  for (const task of db.tasks.filter(row => row.link === next.id && !closed(row))) {
    const notes = [];
    const oldOwner = task.owner;
    if (status === 'Cancelled' && previous.status !== status && input.linkedAction === 'cancel') {
      task.status = 'Cancelled';
      task.cancel = text(input.cancelReason);
      notes.push('Cancelled with fixture');
    } else {
      if (task.inherit && next.lead !== previous.lead) {
        task.owner = next.lead;
        task.supporting = task.supporting.filter(person => person !== next.lead);
        notes.push('Inherited fixture lead updated');
      }
      if (task.basis === 'Fixture relative' && next.date !== previous.date) {
        const newDate = shift(next.date,-task.offset);
        notes.push('Relative deadline ' + (task.due || 'undated') + ' → ' + newDate);
        task.due = newDate;
      }
    }
    if (notes.length) {
      task.version++;
      task.updated = iso();
      task.editor = actor;
      activity(db,actor,task.id,'Linked fixture changed',notes.join('. '));
    }
    if (hasMaterialChange) for (const user of new Set([oldOwner,task.owner])) notify(db,user,'fixture:' + next.id + ':' + next.updated + ':' + task.id,'Linked fixture changed',task.id);
  }
  if (hasMaterialChange) for (const user of new Set([previous.lead, next.lead, ...previous.supporting, ...next.supporting])) notify(db,user,'fixture:' + next.id + ':' + next.updated,'Fixture arrangements changed',next.id);
  return next;
}

export function applyChecklist(db, actor, id) {
  const fixture = get(db,'fixtures',id);
  ensure(admin(db,actor) && fixture && fixture.status !== 'Cancelled', 'This fixture is unavailable for checklist generation.');
  const created = [];
  fixtureSteps.forEach(([title,next],index) => {
    const key = id + ':prep:v1:' + index;
    if (db.tasks.some(task => task.templateKey === key)) return;
    const final = index === fixtureSteps.length-1;
    const offset = final ? -1 : db.settings.prep;
    const item = {
      id:makeId('t'), title,next, area:'Fixtures', priority:'Normal', status:'Needs review',
      owner:fixture.lead, supporting:[...fixture.supporting], link:id, due:shift(fixture.date,-offset), offset,
      basis:'Fixture relative', inherit:true, reviewReason:'Check checklist assignment before activation.',
      reviewer:actor, templateKey:key, requiresEvidence:final, personal:false, version:1,
      comments:[], created:iso(), updated:iso(), editor:actor
    };
    db.tasks.push(item);
    created.push(item);
    activity(db,actor,item.id,'Fixture checklist task generated');
  });
  return created;
}

export function saveProject(db, actor, input, id = '') {
  const previous = get(db,'projects',id);
  ensure(admin(db,actor) || (hasRole(db,actor) && member(previous,actor)), 'Project access is required.');
  ensure(!id || previous, 'Project unavailable.');
  const isAdmin = admin(db,actor);
  const lead = isAdmin ? text(input.lead) : previous.lead;
  const members = isAdmin ? list(input.members).filter(person => person !== lead) : previous.members;
  const status = isAdmin ? input.status : previous.status;
  ensure(text(input.title) && text(input.next) && hasRole(db,lead) && within(status,projectStates), 'Enter a project title, active lead, status and next action.');
  ensure(members.every(person => hasRole(db,person) || previous?.members.includes(person)), 'Select active collaborators.');
  ensure(validDate(text(input.start)) && validDate(text(input.end)) && (!input.start || !input.end || input.start <= input.end), 'Enter a valid project date range.');
  ensure(status !== 'Cancelled' || previous?.status === 'Cancelled' || text(input.reason), 'Enter a cancellation reason.');
  const removed = previous && [previous.lead,...previous.members].filter(person => ![lead,...members].includes(person));
  ensure(!removed || !db.tasks.some(task => task.link === id && !closed(task) && removed.some(person => !admin(db,person) && [task.owner,...task.supporting].includes(person))), 'Reassign open project tasks before removing a project member.');
  const milestones = previous?.milestones || (input.kind === 'Trip' ? tripSteps.map(title => ({id:makeId('m'),title,mandatory:true,done:false})) : []);
  const next = {...previous,id:previous?.id || makeId('p'),title:text(input.title),kind:text(input.kind),lead,members,status,next:text(input.next),start:text(input.start),end:text(input.end),budget:Math.max(0,Number(input.budget)||0),source:text(input.source),milestones,decisions:previous?.decisions || [],payments:previous?.payments || [],updated:iso()};
  replace(db.projects,next);
  activity(db,actor,next.id,previous ? 'Project updated' : 'Project created',text(input.reason));
  return next;
}

export function saveRequest(db, actor, input, id = '') {
  const previous = get(db,'requests',id);
  ensure(hasRole(db,actor) && (!id || (previous && admin(db,actor))), 'Only an administrator can review requests.');
  const status = previous ? text(input.status) : 'Submitted';
  const decision = text(input.decision);
  ensure(within(status,requestStates) && (previous || (text(input.title) && text(input.description) && within(input.priority,priorities))), 'Enter a title, description and priority.');
  ensure(!['Approved','Declined','Resolved'].includes(status) || decision, 'Record a decision note.');
  const next = previous ? {...previous,status,decision,approver:actor,decided:iso(),updated:iso()} : {
    id:makeId('q'),title:text(input.title),description:text(input.description),requester:actor,category:text(input.category),priority:input.priority,
    evidence:text(input.evidence),estimate:Math.max(0,Number(input.estimate)||0), status, decision:'', task:'',updated:iso()
  };
  replace(db.requests,next);
  activity(db,actor,next.id, previous ? 'Request ' + status.toLowerCase() : 'Request submitted');
  if (previous && status !== previous.status) notify(db,next.requester,'request:' + next.id + ':' + next.updated,'Operational request updated',next.id);
  if (!previous) db.users.filter(user => user.active && user.role === 'admin').forEach(user => notify(db,user.id,'request:' + next.id,'New operational request',next.id));
  return next;
}

export function runJobs(db, actor = 'system', simulateFailure = false) {
  db.settings.jobs = { last:iso(), failed:simulateFailure ? 'Simulated reminder job failure' : '', runs:db.settings.jobs.runs+1 };
  if (simulateFailure) {
    activity(db,actor,'jobs','Reminder job failed');
    return;
  }
  for (const template of db.templates) {
    if (!template.active || !template.start) continue;
    let date = template.start;
    while (date <= today()) {
      const key = template.id + ':' + date;
      if ((!template.effective || date >= template.effective) && !db.tasks.some(item => item.recurrenceKey === key) && hasRole(db,template.owner)) {
        const task = {id:makeId('t'), title:template.title, next:template.next, owner:template.owner, area:'Operations', priority:'Normal', due:date, basis:'Fixed', status:'To do', personal:false, supporting:[], link:'', comments:[], version:1, created:iso(), updated:iso(), editor:actor, recurrenceKey:key};
        db.tasks.push(task);
        notify(db,task.owner,'repeat:' + key,'Recurring task assigned',task.id);
        activity(db,actor,task.id,'Recurring task generated');
      }
      if (template.cadence === 'Termly') {
        const month = new Date(date + 'T12:00:00Z');
        month.setUTCDate(1);
        month.setUTCMonth(month.getUTCMonth()+3);
        const last = new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
        month.setUTCDate(Math.min(Number(template.start.slice(-2)),last));
        date = month.toISOString().slice(0,10);
      } else date = shift(date,7);
    }
  }
  for (const task of db.tasks) {
    if (closed(task) || !task.owner || task.status === 'Needs review') continue;
    if (parent(db,task.link)?.status === 'Cancelled') continue;
    if (task.due === due(1)) notify(db,task.owner,'due:' + task.id + ':' + task.due,'Task due tomorrow',task.id);
    if (task.due === due(-1)) notify(db,task.owner,'late:' + task.id + ':' + task.due,'Task is overdue',task.id);
    if (task.status === 'Waiting' && task.chase === today()) notify(db,task.owner,'chase:' + task.id + ':' + task.chase,'Follow-up due today',task.id);
  }
}

export const sampleImport = () => ({
  source:'Department Control Centre (invented sample)', batch:'sample-v1',
  tasks:[
    {sourceId:'sample-task-01',title:'Check sample field booking',next:'Confirm the venue with facilities.',email:'alex@example.invalid',due:due(4),reviewReason:'Imported from the demo snapshot.'},
    {sourceId:'sample-task-02',title:'Confirm sample staffing',next:'Confirm the staff mapping.',email:'provisional@example.invalid',due:due(3)},
    {sourceId:'sample-task-03',title:'',next:'Missing title',email:'alex@example.invalid'}
  ],
  fixtures:[
    {sourceId:'sample-fixture-01',title:'Sample Badminton Meet',sport:'Badminton',team:'U15',date:due(15),email:'',conflict:'Check the provisional date with the source.'}
  ]
});

export function previewImport(db, payload) {
  ensure(payload && typeof payload === 'object' && text(payload.batch) && (Array.isArray(payload.tasks) || Array.isArray(payload.fixtures)), 'Supply a JSON snapshot with a batch ID and tasks or fixtures.');
  const rows = [];
  const keys = new Set();
  for (const type of ['tasks','fixtures']) for (const row of payload[type] || []) {
    const sourceId = text(row?.sourceId);
    const key = type + ':' + sourceId;
    const incomingDate = text(row?.due || row?.date);
    const user = db.users.find(person => person.active && person.email.toLowerCase() === text(row?.email).toLowerCase());
    const existing = db[type].find(record => record.sourceId === sourceId);
    const fields = type === 'tasks' ? {'title':text(row?.title),'next':text(row?.next),'due':incomingDate,'owner':user?.id || ''} : {'title':text(row?.title),'date':incomingDate,'sport':text(row?.sport),'team':text(row?.team),'lead':user?.id || ''};
    const differences = existing ? Object.keys(fields).filter(field => text(existing[field]) !== text(fields[field])).map(field => field + ': ' + (existing[field] || '—') + ' → ' + (fields[field] || '—')) : [];
    let result = 'Accepted';
    let detail = '';
    if (!sourceId || !text(row?.title) || !validDate(incomingDate) || (type === 'tasks' ? !text(row?.next) : !incomingDate || !text(row?.sport) || !text(row?.team))) {
      result = 'Rejected';
      detail = 'Required fields are missing or invalid.';
    } else if (keys.has(key) || existing || db.imports.some(batch => batch.batch === payload.batch)) {
      result = 'Duplicate';
      detail = differences.length ? differences.join(' · ') : 'Record or batch already exists.';
    } else if (!user || text(row?.conflict)) {
      result = 'Review';
      detail = [!user && 'Unmapped owner or fixture lead',text(row?.conflict)].filter(Boolean).join('. ');
    }
    keys.add(key);
    rows.push({type,result,detail,row,user:user?.id || '',sourceId});
  }
  return rows;
}

export function commitImport(db, actor, payload) {
  ensure(admin(db,actor), 'Administrator access is required.');
  if (db.imports.some(batch => batch.batch === payload?.batch)) return 0;
  const rows = previewImport(db,payload);
  const added = rows.filter(row => ['Accepted','Review'].includes(row.result));
  for (const item of added) {
    const {row,type,user,sourceId,detail} = item;
    const common = {title:text(row.title),sourceId,updated:iso(),status:'Needs review'};
    const record = type === 'tasks'
      ? {...common,id:makeId('t'),next:text(row.next),owner:user,area:'Operations',priority:'Normal',due:text(row.due),basis:'Fixed',offset:db.settings.prep,undated:'Imported without a deadline.',supporting:[],link:'',comments:[],version:1,created:iso(),editor:actor,reviewer:actor,reviewReason:[text(row.reviewReason),detail].filter(Boolean).join('. ') || 'Review imported task.'}
      : {...common,id:makeId('f'),sport:text(row.sport),team:text(row.team),date:text(row.date),lead:user,supporting:[],next:'Review imported fixture.',reviewed:false,transport:'Unknown',source:text(payload.source) || 'Manual source review',conflict:detail,weekday:text(row.weekday),start:'',end:'',venue:'',meeting:''};
    db[type].push(record);
  }
  db.imports.unshift({id:makeId('i'),batch:text(payload.batch),source:text(payload.source),time:iso(),actor,added:added.length,rejected:rows.filter(row => row.result === 'Rejected').length,duplicates:rows.filter(row => row.result === 'Duplicate').length,review:rows.filter(row => row.result === 'Review').length});
  activity(db,actor,'imports','Import committed',added.length + ' records added');
  return added.length;
}

export function csv(records) {
  const keys = [...new Set(records.flatMap(row => Object.keys(row)))];
  const cell = value => {
    const raw = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
    return '"' + (/^[=+\-@\t\r]/.test(raw) ? "'" : '') + raw.replaceAll('"','""') + '"';
  };
  return [keys.map(cell).join(','),...records.map(row => keys.map(key => cell(row[key])).join(','))].join('\r\n');
}
