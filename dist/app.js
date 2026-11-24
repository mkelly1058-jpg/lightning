import { due, iso, makeId, today } from './seed.js';
import { activity, admin, applyChecklist, closed, commitImport, csv, get, load, member, notify, ownerName, parent, previewImport, replace, restore, runJobs, sampleImport, saveFixture, saveProject, saveRequest, saveTask, storageKey, taskComment, text, visible } from './model.js';
import { action, badge, blank, dashboard, dateLabel, directory, e, fieldline, fixturePage, health, icon, nav, overview, safeUrl, shell, stamp, studentPage, tag, taskPage } from './view.js';
import { bindConditions, detailFor, formFor, smallForm } from './forms.js';
import { studentRecords } from './student.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const toast = document.querySelector('#toast');
const recordTypes = ['tasks','fixtures','projects','results','requests','documents'];
const typeNames = {tasks:'Task',fixtures:'Fixture',projects:'Project',results:'Result',requests:'Request',documents:'Document',staff:'Demo account'};
const names = {staff:'users',...Object.fromEntries(recordTypes.map(type=>[type,type]))};
const accountKey = 'lightning-demo-account';
let db = load(localStorage);
let actor = sessionStorage.getItem(accountKey) || 'alex';
let toastTimer = 0;
let focusReturn = null;
let mobileOpen = false;
let lastPage = '';
let importDraft = null;
let state = {};

function chooseAccount() {
  if (!get(db,'users',actor)?.active) actor = db.users.find(user=>user.active && user.role === 'staff')?.id || db.users.find(user=>user.active)?.id;
}
chooseAccount();

const pageFromHash = () => decodeHash().split('/')[0] || 'day';
function decodeHash() {
  try { return decodeURIComponent(location.hash.slice(1)); } catch { return 'day'; }
}
const student = () => pageFromHash().startsWith('student');
const activeUser = id => get(db,'users',id)?.active;
const adminOnly = () => requireValue(admin(db,actor),'Administrator access is required for this action.');
const requireValue = (test,message) => { if(!test)throw new Error(message); };

function flash(message) {
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{toast.textContent='';},3800);
}

function update(mutator) {
  const transaction = () => commit(mutator);
  return navigator.locks ? navigator.locks.request(storageKey,transaction) : Promise.resolve().then(transaction);
}

function commit(mutator) {
  const raw = localStorage.getItem(storageKey);
  const current = raw ? restore(JSON.parse(raw)) : db;
  requireValue(get(current,'users',actor)?.active,'This demo account has been disabled.');
  const draft = structuredClone(current);
  const result = mutator(draft);
  draft.revision = current.revision+1;
  localStorage.setItem(storageKey,JSON.stringify(draft));
  db = draft;
  return result;
}

function refresh() {
  db = load(localStorage);
  chooseAccount();
}

function render() {
  const page = pageFromHash();
  if (student()) {
    app.innerHTML=studentPage(page,state.studentFilter);
    document.title='Lightning Sports | Student view';
    return;
  }
  const tab = nav.find(row=>row[0]===page);
  const canSee = tab && (!['overview','staff','health'].includes(page)||admin(db,actor));
  const selected = canSee ? page : 'day';
  const content = selected==='day'?dashboard(db,actor,state):selected==='overview'?overview(db):selected==='tasks'?taskPage(db,actor,state):
    selected==='fixtures'?fixturePage(db,actor,state):selected==='health'?health(db):directory(db,actor,selected);
  app.innerHTML=shell(content,db,actor,selected,mobileOpen);
  document.title=(nav.find(row=>row[0]===selected)?.[1] || 'My Day')+' | Lightning PE HQ';
}


function route() {
  const page = pageFromHash();
  if (page!==lastPage) {
    mobileOpen=false;
    if(page.startsWith('student')) state.studentFilter='';
    closeDialog(false);
    window.scrollTo(0,0);
  }
  lastPage=page;
  render();
  const recordId=decodeHash().split('/')[1];
  if(recordId && recordTypes.includes(page)) showDetail(page,recordId);
}
function navigate(page) {
  if (page===decodeHash()) { render(); return; }
  location.hash = page;
}

dialog.addEventListener('close',()=>{
  if(focusReturn?.isConnected)focusReturn.focus();
  focusReturn=null;
});
function closeDialog(restoreFocus = true) {
  if(!restoreFocus)focusReturn=null;
  if(dialog.open)dialog.close();
}
function show(title,body,subtitle='') {
  if(!dialog.open)focusReturn=document.activeElement;
  dialog.innerHTML='<header class="dialog-head"><div>'+(subtitle?'<small>'+e(subtitle)+'</small>':'')+'<h2 id="dialog-title" tabindex="-1">'+e(title)+'</h2></div><button type="button" class="icon-btn" aria-label="Close dialog" data-action="close">'+icon('x',20)+'</button></header><div class="dialog-body">'+body+'</div>';
  dialog.querySelectorAll('form').forEach(form=>{form.dataset.revision=db.revision;bindConditions(form);});
  if(!dialog.open)dialog.showModal();
  dialog.scrollTop=0;
  (dialog.querySelector('[autofocus]')||dialog.querySelector('#dialog-title')).focus();
}
function accessible(type,id) {
  if(type==='staff') return admin(db,actor) ? get(db,'users',id) : undefined;
  return recordTypes.includes(type)?visible(db,type,actor).find(item=>item.id===id):undefined;
}
function showDetail(type,id) {
  const record=accessible(type,id);
  if(!record) { show('Record unavailable',blank('This record isn’t available to this account.','','file')); return; }
  show(record.title || record.name,detailFor(db,actor,type,record),typeNames[type]);
}
function showEditor(type,id='',related='') {
  const record=id ? accessible(type,id) : undefined;
  if((id&&!record)||!typeNames[type]){show('Record unavailable',blank('This record isn’t available to this account.'));return;}
  if(['fixtures','projects','documents','staff'].includes(type)&&!id&&!admin(db,actor))return;
  const label=id ? 'Edit '+typeNames[type].toLowerCase() : ({requests:'Raise a request',results:'Record a result',staff:'Add demo account'}[type] || 'New '+typeNames[type].toLowerCase());
  show(label,formFor(db,actor,type,record || {},{link:related}),record?.title || '');
}
function refreshAfter(message,type='',id='') {
  render();
  if(type && id) showDetail(type,id);
  else closeDialog();
  flash(message);
}
function profile() {
  const body='<p class="hint">Switch between invented staff and administrator accounts.</p><div class="account-list">'+db.users.filter(user=>user.active).map(user=>
    '<button type="button" class="record-row" data-action="switch-user" data-value="'+e(user.id)+'"><span class="avatar">'+e(user.initials)+'</span><span class="record-copy"><strong>'+e(user.name)+'</strong><small>'+(user.role==='admin'?'Administrator':'Staff member')+'</small></span>'+(actor===user.id?tag('Current'):'')+'</button>').join('')+'</div>';
  show('Demo accounts',body);
}
function searchResults(value) {
  const query=text(value).toLowerCase();
  const container=dialog.querySelector('#search-results');
  if(!container)return;
  if(!query){container.innerHTML='<p class="hint">Search accessible titles, next actions, sports and areas.</p>';return;}
  const results=recordTypes.flatMap(type=>visible(db,type,actor).filter(item=>[item.title,item.next,item.area,item.sport,item.team,item.summary].some(value=>String(value||'').toLowerCase().includes(query))).map(item=>[type,item])).slice(0,30);
  container.innerHTML=results.map(([type,item])=>'<button type="button" class="record-row" data-action="detail" data-value="'+e(type+':'+item.id)+'">'+badge({tasks:'tasks',fixtures:'calendar',projects:'projects',results:'trophy',requests:'requests',documents:'file'}[type],'neutral')+'<span class="record-copy"><strong>'+e(item.title)+'</strong><small>'+e(typeNames[type])+'</small></span>'+icon('right',16)+'</button>').join('')||blank('No matching records','','search');
}
function notificationList() {
  const items=visible(db,'notifications',actor).filter(item=>!item.snooze||item.snooze<=today());
  const body=items.map(item=>{
    const linked=recordTypes.map(type=>[type,accessible(type,item.record)]).find(([,record])=>record);
    return '<div class="event-line"><strong>'+e(item.title)+'</strong><small>'+stamp(item.created)+' · '+(item.read?'Read':'Unread')+'</small><div class="actions">'+
      (linked?action('Open record','detail',linked[0]+':'+item.record,'outline'):'')+(!item.read?action('Mark read','notice-read',item.id,'outline'):'')+
      action('Snooze until tomorrow','notice-snooze',item.id,'outline')+'</div></div>';
  }).join('');
  show('Notifications',body || blank('You’re up to date','New in-app updates will appear here.','bell'));
}
function showImport(payload) {
  const rows=previewImport(db,payload);
  importDraft=payload;
  const accum=Object.fromEntries(['Accepted','Review','Rejected','Duplicate'].map(label=>[label,rows.filter(row=>row.result===label).length]));
  const body='<p class="hint">Batch '+e(payload.batch)+' · '+e(payload.source || 'Uploaded snapshot')+'</p>'+
    '<dl class="details">'+Object.entries(accum).map(([key,value])=>fieldline(key,String(value))).join('')+'</dl>'+
    '<div class="table-wrap"><table><thead><tr><th>Record</th><th>Status</th><th>Review details</th></tr></thead><tbody>'+
    rows.map(item=>'<tr><td>'+e(item.row?.title || item.sourceId || 'Untitled row')+'</td><td>'+tag(item.result)+'</td><td>'+e(item.detail || 'Ready for review on import')+'</td></tr>').join('')+
    '</tbody></table></div><div class="actions">'+((accum.Accepted+accum.Review)>0?action('Commit import','commit-import','','primary'):'')+
    action('Choose another file','import','','outline')+action('Close','close','','outline')+'</div>';
  show('Import preview',body);
}
function templateList() {
  show('Recurring templates','<p class="hint">Runnable demo templates. Each scheduled occurrence keeps its own task and history.</p>'+
    db.templates.map(item=>'<div class="line-item"><div><strong>'+e(item.title)+'</strong><small>'+e(item.cadence)+' · '+e(ownerName(db,item.owner))+' · '+(item.active?'Active':'Paused')+'</small></div>'+action('Edit template','template',item.id,'outline')+'</div>').join('')+
    '<div class="actions">'+action('New template','template','','primary','plus')+'</div>');
}
function studentEvent(id) {
  const item=studentRecords().events.find(record=>record.id===id);
  if(!item)return;
  show(item.title,'<dl class="details">'+[
    ['Sport and team',item.sport+' · '+item.team],['Date',dateLabel(item.date,{weekday:'long',day:'numeric',month:'long'})],['Start time',item.time],
    ['Venue',item.venue],['Meeting point',item.meeting],['Arrive by',item.arrive]
  ].map(([label,value])=>fieldline(label,e(value))).join('')+'</dl><div class="next-box"><strong>What to bring</strong><p>'+e(item.kit)+'</p></div>'+
  '<p class="hint">Times are local to Malaysia. This fixture uses demo data.</p>','Student fixture');
}
function download(filename,content,mime) {
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const link=document.createElement('a');
  link.href=url;link.download=filename;
  document.body.append(link);
  link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

document.addEventListener('click', async event=>{
  const control=event.target.closest('[data-action]');
  if(!control)return;
  const {action:kind,value=''}=control.dataset;
  const [type,id]=value.split(':');
  try {
    if(kind==='close'){closeDialog();return;}
    if(kind==='student-filter'&&student()){
      state.studentFilter=value;
      render();
      [...app.querySelectorAll('[data-action="student-filter"]')].find(item=>item.dataset.value===value)?.focus();
      return;
    }
    if(kind==='student-event'&&student()){studentEvent(value);return;}
    if(student())return;
    switch(kind){
      case 'menu': mobileOpen=!mobileOpen;render();app.querySelector('.mobile-menu')?.focus();break;
      case 'navigate': navigate(value);break;
      case 'day-tab':
        state.dayTab=value;
        render();
        [...app.querySelectorAll('[data-action="day-tab"]')].find(item=>item.dataset.value===value && item.classList.contains(control.classList.contains('metric')?'metric':'tab'))?.focus();
        break;
      case 'bucket': state={...state,taskFilter:value,owner:'',taskStatus:'',area:'',from:'',to:''};navigate('tasks');break;
      case 'owner-filter': state={...state,owner:value,taskFilter:'Active',area:'',taskStatus:'',from:'',to:''};navigate('tasks');break;
      case 'fixture-mode': state.fixtureMode=value;render();[...app.querySelectorAll('[data-action="fixture-mode"]')].find(item=>item.dataset.value===value)?.focus();break;
      case 'fixture-filter': state={...state,upcoming:value==='upcoming',missingLead:value==='missing-lead',sport:'',team:'',coach:'',month:'',fixtureMode:'List'};navigate('fixtures');break;
      case 'month': state.month=value;render();app.querySelector('.cal-head h2')?.setAttribute('tabindex','-1');app.querySelector('.cal-head h2')?.focus();break;
      case 'jump': document.getElementById(value)?.focus();break;
      case 'detail': showDetail(type,id);break;
      case 'edit': showEditor(type,id);break;
      case 'new': showEditor(type);break;
      case 'new-related': showEditor(type,'',id);break;
      case 'profile': profile();break;
      case 'switch-user':
        requireValue(activeUser(value),'This demo account is disabled.');
        actor=value;sessionStorage.setItem(accountKey,actor);state={};
        closeDialog(false);navigate(admin(db,actor)?'overview':'day');flash('Switched to '+ownerName(db,actor));break;
      case 'search':
        show('Search workspace','<label class="sr-only" for="global-search">Search accessible records</label><input class="search-field" id="global-search" type="search" placeholder="Search tasks, fixtures and more" autofocus><div class="search-results" id="search-results" aria-live="polite"></div>');
        searchResults('');break;
      case 'notifications': notificationList();break;
      case 'notice-read':
      case 'notice-snooze':
        await update(draft=>{
          const item=get(draft,'notifications',value);
          requireValue(item?.user===actor,'This notification is unavailable.');
          if(kind==='notice-read')item.read=true;
          else item.snooze=due(1);
        });render();notificationList();break;
      case 'resolve-reassignment':
        adminOnly();await update(draft=>{const item=get(draft,'tasks',value);item.reassignmentResolved=iso();item.version++;item.updated=iso();activity(draft,actor,value,'Reassignment reviewed');});
        refreshAfter('Reassignment marked reviewed','tasks',value);break;
      case 'checklist': {
        adminOnly();
        const count=await update(draft=>applyChecklist(draft,actor,value).length);
        refreshAfter(count ? count+' checklist tasks added for review' : 'Checklist already exists','fixtures',value);
        break;
      }
      case 'project-form': {
        const item=accessible('projects',type);
        requireValue(item && item.status!=='Cancelled' && (id==='milestone'||admin(db,actor)),'Project action unavailable.');
        show({milestone:'New milestone',decision:'Record approval',payment:'New payment milestone'}[id],smallForm('project-sub',db,item,id),item.title);break;
      }
      case 'milestone':
      case 'payment':
        await update(draft=>{
          const item=get(draft,'projects',type);
          requireValue(item && item.status!=='Cancelled' && (admin(draft,actor)||(kind==='milestone'&&member(item,actor))),'Project action unavailable.');
          if(kind==='milestone'){const milestone=item.milestones.find(row=>row.id===id);milestone.done=!milestone.done;}
          else item.payments[Number(id)].paid=!item.payments[Number(id)].paid;
          item.updated=iso();activity(draft,actor,item.id,kind==='milestone'?'Milestone updated':'Payment milestone updated');
        });
        refreshAfter('Saved','projects',type);break;
      case 'result-review': {
        const item=accessible('results',value);
        requireValue(item && (admin(db,actor)||parent(db,item.link)?.lead===actor),'Recognition access is required.');
        show('Review recognition',smallForm('result-review',db,item),item.title);break;
      }
      case 'request-task': {
        adminOnly();
        const request=get(db,'requests',value);
        requireValue(request && !request.task,'A task already exists for this request.');
        show('Create linked task',formFor(db,actor,'tasks',{title:request.title,next:'Follow up on the approved request.',owner:request.requester,area:request.category==='Equipment'?'Equipment':'Operations',status:'To do',priority:request.priority,due:due(7)}),request.title);
        dialog.querySelector('form').dataset.request=value;
        break;
      }
      case 'import':
        adminOnly();
        if(value==='sample')showImport(sampleImport());
        else show('Preview a snapshot',smallForm('import',db)+'<div class="actions">'+action('Use sample snapshot','import','sample','outline')+action('Download sample JSON','sample-download','','outline','download')+'</div>');
        break;
      case 'sample-download': adminOnly();download('lightning-sample-import.json',JSON.stringify(sampleImport(),null,2),'application/json');break;
      case 'commit-import': {
        adminOnly();
        const count=await update(draft=>commitImport(draft,actor,importDraft));
        importDraft=null;refreshAfter(count+' records added');break;
      }
      case 'settings': adminOnly();show('Source review settings',smallForm('settings',db));break;
      case 'job': adminOnly();await update(draft=>runJobs(draft,actor,value==='fail'));refreshAfter(value==='fail'?'Simulated failure logged':'Reminder jobs finished');break;
      case 'templates': adminOnly();templateList();break;
      case 'template': adminOnly();show(value?'Edit recurring template':'New recurring template',smallForm('template',db,get(db,'templates',value)));break;
      case 'export':
        adminOnly();
        show('Export core records','<p class="hint">Download a CSV snapshot for a record type.</p><div class="actions">'+[...recordTypes,'staff'].map(key=>action(typeNames[key],'download-csv',key,'outline','download')).join('')+'</div>');
        break;
      case 'download-csv': adminOnly();requireValue(names[value],'Unknown export.');download('lightning-'+value+'.csv',csv(db[names[value]]),'text/csv;charset=utf-8');break;
      case 'backup': adminOnly();download('lightning-backup-'+today()+'.json',JSON.stringify(db,null,2),'application/json');break;
      case 'restore': adminOnly();show('Restore demo backup',smallForm('restore',db));break;
    }
  } catch(error) { flash(error.message); }
});

document.addEventListener('input',event=>{
  if(event.target.id==='global-search')searchResults(event.target.value);
});
document.addEventListener('change',event=>{
  const filter=event.target.closest('[data-form="filters"]');
  if(!filter)return;
  const target=event.target;
  const name=target.name;
  state[name]=target.type==='checkbox'?target.checked:target.value;
  render();
  const next=[...app.querySelectorAll('[data-form="filters"] input, [data-form="filters"] select')].find(item=>item.name===name);
  next?.focus();
});

function validateLink(value) { return !text(value)||Boolean(safeUrl(value)); }
function saveOther(draft,kind,data,id) {
  const management=admin(draft,actor);
  if(kind==='result'){
    const previous=get(draft,'results',id);
    const linked=parent(draft,data.link);
    requireValue((!id||previous)&&(management||!previous||previous.author===actor)&&linked&&linked.status!=='Cancelled'&&(management||get(draft,'fixtures',data.link)||member(linked,actor)), 'Choose a fixture or project you can access.');
    requireValue(text(data.title)&&text(data.outcome)&&text(data.summary)&&validateLink(data.evidence),'Enter valid result details.');
    const next={...previous,id:previous?.id||makeId('r'),title:text(data.title),link:data.link,outcome:text(data.outcome),placing:text(data.placing),
      summary:text(data.summary),reference:text(data.reference),photo:text(data.photo),evidence:text(data.evidence),author:previous?.author||actor,
      celebration:'In review',reviewer:linked.lead||'',reviewNote:'',updated:iso()};
    replace(draft.results,next);activity(draft,actor,next.id,'Result submitted for review');
    notify(draft,next.reviewer,'result:'+next.id+':'+next.updated,'A result is ready for review',next.id);
    return next;
  }
  if(kind==='result-review'){
    const result=get(draft,'results',id);
    requireValue(result && (management||parent(draft,result.link)?.lead===actor) && text(data.reviewNote),'Enter a review note.');
    requireValue(['In review','Approved','Hold'].includes(data.celebration),'Select a recognition state.');
    requireValue(data.celebration!=='Approved'||!result.reference||['Granted','Not required'].includes(result.photo),'Resolve photo permission before approving a student recognition record.');
    result.celebration=data.celebration;result.reviewNote=text(data.reviewNote);result.reviewer=actor;result.reviewed=iso();result.updated=iso();
    activity(draft,actor,id,'Recognition reviewed');return result;
  }
  if(kind==='document'){
    const previous=get(draft,'documents',id);
    const url=safeUrl(data.url);
    requireValue(management&&(!id||previous)&&text(data.title)&&text(data.trigger)&&url&&['drive.google.com','docs.google.com'].includes(new URL(url).hostname),'Enter an authoritative Drive link, title and review trigger.');
    requireValue(get(draft,'users',data.owner)?.active&&(!data.project||get(draft,'projects',data.project)),'Choose a valid owner and project.');
    const record={...previous,id:previous?.id||makeId('d'),title:text(data.title),url,owner:data.owner,area:data.area,review:data.review,
      trigger:text(data.trigger),project:data.project,flag:data.clear==='on'?'':previous?.flag||'',updated:iso()};
    replace(draft.documents,record);activity(draft,actor,record.id,'Document directory updated');return record;
  }
  if(kind==='document-flag'){
    const item=visible(draft,'documents',actor).find(row=>row.id===id);
    requireValue(item&&text(data.flag),'Describe the link issue.');
    item.flag=text(data.flag);item.updated=iso();activity(draft,actor,id,'Document link flagged');return item;
  }
  if(kind==='project-sub'){
    const item=get(draft,'projects',id);
    requireValue(item&&item.status!=='Cancelled'&&(management||(data.phase==='milestone'&&member(item,actor))),'Project action unavailable.');
    if(data.phase==='milestone'){
      requireValue(text(data.title),'Enter a milestone title.');
      item.milestones.push({id:makeId('m'),title:text(data.title),mandatory:data.mandatory==='on',done:false});
    }else if(data.phase==='decision'){
      requireValue(text(data.note)&&text(data.date)&&safeUrl(data.evidence),'Enter the decision, date and evidence link.');
      item.decisions.push({by:actor,date:data.date,note:text(data.note),evidence:data.evidence});
    }else if(data.phase==='payment'){
      requireValue(text(data.title)&&text(data.date)&&Number(data.amount)>=0,'Enter a title, date and amount.');
      item.payments.push({title:text(data.title),date:data.date,amount:Number(data.amount),paid:false});
    }else throw new Error('Project action unavailable.');
    item.updated=iso();activity(draft,actor,id,'Project '+data.phase+' recorded');return item;
  }
  if(kind==='staff'){
    requireValue(management,'Administrator access is required.');
    const previous=get(draft,'users',id);
    const email=text(data.email).toLowerCase();
    const active=data.active==='on';
    requireValue((!id||previous)&&text(data.name)&&email&&['admin','staff'].includes(data.role)&&!draft.users.some(row=>row.id!==id&&row.email.toLowerCase()===email),'Enter a unique email and valid account details.');
    requireValue(id!==actor||active&&data.role==='admin','Keep the current administrator active.');
    const next={...previous,id:previous?.id||makeId('u'),name:text(data.name),email,active,role:data.role,responsibilities:text(data.responsibilities),
      initials:text(data.name).split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()};
    if(previous?.active&&!active){
      const owned=draft.tasks.filter(item=>!closed(item)&&item.owner===id);
      const fixture=draft.fixtures.filter(item=>!['Completed','Cancelled'].includes(item.status)&&item.lead===id);
      const projects=draft.projects.filter(item=>!['Completed','Cancelled'].includes(item.status)&&item.lead===id);
      const templates=draft.templates.filter(item=>item.active&&item.owner===id);
      const documents=draft.documents.filter(item=>item.owner===id);
      const replacement=get(draft,'users',data.replacement);
      requireValue(![...owned,...fixture,...projects,...templates,...documents].length||(replacement?.active&&replacement.id!==id),'Choose an active replacement for assigned work.');
      owned.forEach(item=>{
        item.owner=replacement.id;item.version++;item.updated=iso();item.editor=actor;
        item.supporting=item.supporting.filter(person=>person!==replacement.id);
        const project=get(draft,'projects',item.link);
        if(project&&!member(project,replacement.id)&&!admin(draft,replacement.id))project.members.push(replacement.id);
        activity(draft,actor,item.id,'Task reassigned after deactivation');
        notify(draft,replacement.id,'deactivate:'+item.id+':'+item.version,'Task assigned to you',item.id);
      });
      [...fixture,...projects].forEach(item=>{
        item.lead=replacement.id;item.updated=iso();
        if(item.supporting)item.supporting=item.supporting.filter(person=>person!==replacement.id);
        if(item.members)item.members=item.members.filter(person=>person!==replacement.id);
        activity(draft,actor,item.id,'Lead reassigned after deactivation');
      });
      [...templates,...documents].forEach(item=>{item.owner=replacement.id;item.updated=iso();activity(draft,actor,item.id,'Owner reassigned after deactivation');});
    }
    replace(draft.users,next);activity(draft,actor,next.id,active?'Demo account saved':'Demo account disabled');return next;
  }
  if(kind==='settings'){
    requireValue(management&&Number.isInteger(Number(data.prep))&&data.prep>=0&&data.prep<=365,'Enter a valid preparation offset.');
    draft.settings.prep=Number(data.prep);draft.settings.verified=data.verified;activity(draft,actor,'settings','Source review settings updated');return;
  }
  if(kind==='template'){
    const previous=get(draft,'templates',id);
    requireValue(management&&(!id||previous)&&get(draft,'users',data.owner)?.active&&text(data.title)&&text(data.next)&&text(data.start)&&['Weekly','Termly'].includes(data.cadence),'Enter a valid recurring template.');
    const next={...previous,id:previous?.id||makeId('rec'),title:text(data.title),next:text(data.next),cadence:data.cadence,
      owner:data.owner,start:data.start,effective:previous ? today() : '',active:data.active==='on',updated:iso()};
    replace(draft.templates,next);activity(draft,actor,next.id,'Recurring template saved');return next;
  }
  throw new Error('Unknown save action.');
}

async function submitted(event) {
  const node=event.target.closest('form[data-form]');
  if(!node)return;
  event.preventDefault();
  if(node.dataset.form==='filters'||student())return;
  const {form:kind,id='',version='',revision,request}=node.dataset;
  const formData=new FormData(node);
  const data=Object.fromEntries(formData.entries());
  data.supporting=formData.getAll('supporting');
  data.members=formData.getAll('members');
  const feedback=node.querySelector('.form-message');
  const button=node.querySelector('button[type="submit"]');
  button.disabled=true;feedback.classList.remove('error');feedback.textContent='Saving…';
  try {
    if(kind==='preview-import'){
      adminOnly();
      showImport(JSON.parse(await data.file.text()));
      return;
    }
    if(kind==='restore'){
      adminOnly();
      const next=restore(JSON.parse(await data.file.text()));
      await update(draft=>{requireValue(admin(draft,actor),'Administrator access is required.');Object.assign(draft,next);});
      chooseAccount();
      refreshAfter('Demo backup restored');
      if(!admin(db,actor))navigate('day');
      return;
    }
    const result = await update(draft=>{
      if(id&&!['task','comment'].includes(kind)) requireValue(Number(revision)===draft.revision,'The demo changed in another view. Close and reopen this form to load current data.');
      if(kind==='task'){
        requireValue(validateLink(data.evidence),'Enter a valid evidence link.');
        if(request)requireValue(admin(draft,actor)&&get(draft,'requests',request)&&!get(draft,'requests',request).task,'A linked task already exists.');
        const task=saveTask(draft,actor,data,id,Number(version));
        if(request){const record=get(draft,'requests',request);record.task=task.id;record.updated=iso();activity(draft,actor,record.id,'Request task linked');}
        return task;
      }
      if(kind==='comment'){taskComment(draft,actor,id,data.note,data.reassign==='on');return get(draft,'tasks',id);}
      if(kind==='fixture'){
        const fixture=saveFixture(draft,actor,data,id);
        if(!id&&data.checklist==='on')applyChecklist(draft,actor,fixture.id);
        return fixture;
      }
      if(kind==='project')return saveProject(draft,actor,data,id);
      if(kind==='request'||kind==='request-review')return saveRequest(draft,actor,data,id);
      return saveOther(draft,kind,data,id);
    });
    const type=({task:'tasks',comment:'tasks',fixture:'fixtures',project:'projects',request:'requests','request-review':'requests',
      result:'results','result-review':'results',document:'documents','document-flag':'documents','project-sub':'projects',staff:'staff'})[kind];
    refreshAfter(kind==='request'?'Request submitted':kind==='result'?'Result submitted for review':'Saved',type,result?.id);
    if(kind==='template')templateList();
  } catch(error) {
    feedback.textContent='Save failed. '+error.message;
    feedback.classList.add('error');button.disabled=false;
  }
}

document.addEventListener('submit',submitted);
document.addEventListener('keydown',event=>{
  if(event.key==='/'&&!student()&&!dialog.open&&!event.target.matches('input,textarea,select,[contenteditable]')){
    event.preventDefault();app.querySelector('[data-action="search"]')?.click();
  }
});
window.addEventListener('hashchange',route);
window.addEventListener('storage',event=>{if(event.key===storageKey){refresh();render();}});
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();document.querySelector('#main')?.focus();});
if (!db.settings.jobs.last || dateLabel(db.settings.jobs.last)!==dateLabel(today())) {
  update(draft=>runJobs(draft)).then(render).catch(()=>{});
}
route();
