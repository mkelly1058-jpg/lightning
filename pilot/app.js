import { createClient } from '@supabase/supabase-js';
import { action, badge, blank, dateLabel, e, fieldline, icon, select, tag } from '../dist/view.js';

const app = document.querySelector('#app');
const feedback = document.querySelector('#feedback');
const signOut = document.querySelector('#sign-out');
const dialog = document.querySelector('#task-dialog');
const pageSize = 25;
const statuses = ['To do', 'In progress', 'Waiting', 'Done', 'Cancelled'];
const priorities = ['Low', 'Normal', 'High', 'Urgent'];
const config = LIGHTNING_PILOT_CONFIG;
const client = config ? createClient(config.url, config.key, {
  auth: { storage: window.sessionStorage, detectSessionInUrl: false }
}) : null;

let profile = null;
let owners = [];
let records = [];
let page = 0;
let signingOut = false;
let lastTrigger;

function message(value = '', error = false) {
  feedback.textContent = value;
  feedback.classList.toggle('error', error);
}

const input = (label, attrs, wide = false) =>
  '<label class="field'+(wide?' wide':'')+'">'+e(label)+'<input '+attrs+'></label>';
const multiline = (label, name, attributes = '', value = '') =>
  '<label class="field wide">'+e(label)+'<textarea name="'+name+'" '+attributes+'>'+e(value)+'</textarea></label>';
const hero = (title, description, button = '') =>
  '<section class="hero pilot-hero"><div class="hero-inner"><div class="hero-kicker">Staff pilot</div><h1>'+e(title)+'<span>.</span></h1><p>'+e(description)+'</p>'+
  (button?'<div class="hero-actions">'+button+'</div>':'')+'</div></section>';

function loginView() {
  signOut.hidden = true;
  app.innerHTML = hero('Staff sign-in','Sign in with your invited test account.')+
    '<section class="panel pilot-panel pilot-sign-in"><header class="panel-head"><h2>Access the workspace</h2></header><div class="panel-body">'+
    '<form id="login" class="form-grid">'+input('Email','type="email" name="email" autocomplete="username" required')+
    input('Password','type="password" name="password" autocomplete="current-password" required')+
    '<div class="actions"><button class="btn primary" type="submit">Sign in</button></div></form></div></section>';
}

async function showWorkspace(session) {
  if (!session) {
    profile = null;
    owners = [];
    records = [];
    loginView();
    return;
  }
  const result = await client.from('staff_profiles').select('id,display_name,role,active').eq('id',session.user.id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data?.active) {
    await client.auth.signOut({scope:'local'});
    loginView();
    message('This account has no active staff invitation.',true);
    return;
  }
  profile = result.data;
  signOut.hidden = false;
  if (profile.role === 'admin') {
    const {data,error} = await client.from('staff_profiles').select('id,display_name').eq('active',true).order('display_name');
    if (error) throw error;
    owners = data;
  }
  await showTasks(0);
}

async function showTasks(nextPage) {
  const start = nextPage * pageSize;
  const {data,error} = await client.from('staff_tasks').select('*').order('updated_at',{ascending:false}).order('id',{ascending:false}).range(start,start+pageSize);
  if (error) throw error;
  page = nextPage;
  records = data.slice(0,pageSize);
  const management = profile.role === 'admin';
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur'}).format(new Date());
  const rows = records.map(record => {
    const owner = management ? owners.find(user=>user.id===record.owner_id)?.display_name || 'Inactive staff' : profile.display_name;
    const late = record.due_date && record.due_date < today && !['Done','Cancelled'].includes(record.status);
    return '<button class="record-row" type="button" data-action="open" data-value="'+e(record.id)+'">'+badge('tasks','neutral')+
      '<span class="record-copy"><strong>'+e(record.title)+'</strong><small>'+e(record.next_action)+'</small>'+
      '<small>'+e(owner)+' · '+(record.due_date?dateLabel(record.due_date):'Needs a date')+(late?' · Overdue':'')+'</small></span>'+
      tag(record.status)+icon('right',16)+'</button>';
  }).join('');
  app.innerHTML = hero(management?'Department tasks':'My tasks',profile.display_name+' · '+(management?'Administrator':'Staff member'),action('New task','new','','primary','plus'))+
    '<section class="panel pilot-panel"><header class="panel-head"><h2>Task list</h2></header>'+
    (rows || blank('No tasks to show','New tasks will appear here.','tasks'))+
    ((page || data.length>pageSize)?'<div class="pilot-pages">'+(page?action('Previous page','page',page-1,'outline'):'<span></span>')+
      '<span>Page '+(page+1)+'</span>'+(data.length>pageSize?action('Next page','page',page+1,'outline'):'<span></span>')+'</div>':'')+'</section>';
}

function modal(title, body) {
  lastTrigger = document.activeElement;
  dialog.innerHTML = '<header class="dialog-head"><h2 id="pilot-dialog-title" tabindex="-1">'+e(title)+'</h2><button type="button" class="icon-btn" aria-label="Close dialog" data-action="close">'+icon('x',19)+'</button></header><div class="dialog-body">'+body+'</div>';
  dialog.showModal();
  dialog.querySelector('#pilot-dialog-title').focus();
}

function taskForm(kind, body, label) {
  return '<form class="form-grid pilot-form" data-kind="'+kind+'">'+body+
    '<p class="form-message" role="status" aria-live="polite"></p><div class="actions"><button class="btn primary" type="submit">'+label+'</button></div></form>';
}

function createView() {
  modal('New task',taskForm('create',
    input('Task title','name="title" maxlength="160" required',true)+multiline('Next action','next','maxlength="1000" required')+
    '<label class="field">Priority'+select('priority',priorities,'Normal','Priority')+'</label>'+
    input('Due date','name="due" type="date"')+
    multiline('Reason if undated','undated','maxlength="500"')+
    (profile.role==='admin'?'<label class="field wide">Owner'+select('owner',[['','My personal task'],...owners.map(item=>[item.id,item.display_name])],'','Owner')+'</label>':''),
    'Create task'));
  const form=dialog.querySelector('form');
  const requireReason=()=>{form.elements.undated.required=!form.elements.due.value;};
  form.elements.due.addEventListener('input',requireReason);
  requireReason();
}

function statusView(id) {
  const record=records.find(task=>task.id===id);
  if(!record)return;
  const allowed=profile.role==='admin' || record.scope==='personal' ? statuses : statuses.filter(item=>item!=='Cancelled');
  modal(record.title,
    '<div class="next-box"><strong>Next action</strong><p>'+e(record.next_action)+'</p></div><dl class="details">'+
    fieldline('Priority',tag(record.priority))+fieldline('Due date',record.due_date?dateLabel(record.due_date):'Needs a date')+'</dl>'+
    (record.undated_reason?'<p class="pilot-meta">'+e(record.undated_reason)+'</p>':'')+
    taskForm('status','<label class="field">Status'+select('status',allowed,record.status,'Status')+'</label>'+
      '<div class="wide form-grid" data-needs="waiting">'+input('Waiting on','name="waiting" maxlength="200" value="'+e(record.waiting_on)+'"')+
      input('Chase date','name="chase" type="date" value="'+e(record.chase_date)+'"')+'</div>'+
      '<div class="wide" data-needs="outcome">'+multiline('Completion or cancellation note','outcome','maxlength="1000"',record.outcome_note)+'</div>',
      'Save status'));
  const form=dialog.querySelector('form');
  form.dataset.id=record.id;
  form.dataset.version=record.version;
  const sync = () => {
    const status=form.elements.status.value;
    for (const [group,show] of [['waiting',status==='Waiting'],['outcome',['Done','Cancelled'].includes(status)]]) {
      const wrapper=form.querySelector('[data-needs="'+group+'"]');
      wrapper.hidden=!show;
      for (const element of wrapper.querySelectorAll('input,textarea')) {
        element.required=show;
        element.disabled=!show;
      }
    }
  };
  form.elements.status.addEventListener('change',sync);
  sync();
}

dialog.addEventListener('close',()=>{ if (lastTrigger?.isConnected) lastTrigger.focus(); });
document.addEventListener('click',async event=>{
  const control=event.target.closest('[data-action]');
  if (!control) return;
  const {action:kind,value}=control.dataset;
  try {
    if (kind==='new' && profile) createView();
    if (kind==='open' && profile) statusView(value);
    if (kind==='close') dialog.close();
    if (kind==='page' && profile) await showTasks(Number(value));
  } catch (error) { message(error.message || 'Could not open the task list.',true); }
});

document.addEventListener('submit',async event=>{
  if (!client) return;
  const form=event.target;
  if (!(form.id==='login' || form.dataset.kind)) return;
  event.preventDefault();
  const values=new FormData(form);
  const submit=form.querySelector('[type="submit"]');
  submit.disabled=true;
  message();
  const formFeedback=form.querySelector('.form-message');
  try {
    if (form.id==='login') {
      const {data,error}=await client.auth.signInWithPassword({email:values.get('email').trim(),password:values.get('password')});
      form.elements.password.value='';
      if (error) throw error;
      await showWorkspace(data.session);
      return;
    }
    formFeedback.textContent='Saving…';
    const textValue = key => values.get(key)?.trim() || null;
    const {error}=form.dataset.kind==='create' ? await client.rpc('create_staff_task',{
      p_title:textValue('title'),p_next_action:textValue('next'),p_priority:values.get('priority'),
      p_due_date:textValue('due'),p_undated_reason:textValue('undated'),p_owner_id:textValue('owner')
    }) : await client.rpc('update_staff_task_status',{
      p_task_id:form.dataset.id,p_expected_version:Number(form.dataset.version),p_status:values.get('status'),
      p_waiting_on:textValue('waiting'),p_chase_date:textValue('chase'),p_outcome_note:textValue('outcome')
    });
    if (error) throw error;
    dialog.close();
    try { await showTasks(0); message('Saved.'); }
    catch { message('Saved. Reload to see the latest task list.'); }
  } catch (error) {
    const detail = error.code==='23514' || error.code==='23502' ? 'Check the required fields and due-date details.' : error.message || 'Try again.';
    if (formFeedback) formFeedback.textContent='Save failed. '+detail;
    else message('Sign-in failed. '+detail,true);
  } finally { submit.disabled=false; }
});

signOut.addEventListener('click',async()=>{
  signingOut=true;
  try {
    const {error}=await client.auth.signOut({scope:'local'});
    if (error) throw error;
    await showWorkspace(null);
    message('Signed out.');
  } catch (error) { message(error.message || 'Sign-out failed.',true); }
  finally { signingOut=false; }
});

if (client) {
  client.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_OUT'&&!signingOut&&profile) {
      if(dialog.open) dialog.close();
      void showWorkspace(null);
      message('Your session ended. Sign in again.');
    }
  });
  try {
    const {data,error}=await client.auth.getSession();
    if(error) throw error;
    await showWorkspace(data.session);
  } catch (error) {
    loginView();
    message('Could not open the staff workspace. '+(error.message || 'Try signing in again.'),true);
  }
} else {
  app.innerHTML=hero('Staff pilot','This build is ready to connect to a pilot database.');
}
