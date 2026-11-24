import { areas, fixtureStates, logistics, priorities, projectStates, requestStates, statusList, today } from './seed.js';
import { admin, closed, fixtureFlags, get, overdue, ownerName, parent, visible } from './model.js';
import { action, badge, dateLabel, e, fieldline, icon, money, select, sourceLink, stamp, tag } from './view.js';

const empty = (value, fallback='—') => e(value || fallback);
const details = fields => '<dl class="details">'+fields.map(([label,value])=>fieldline(label,value)).join('')+'</dl>';
const section = (title,content) => '<section class="detail-section"><h3>'+e(title)+'</h3>'+content+'</section>';
const buttons = (...items) => '<div class="actions">'+items.join('')+'</div>';
const recordButton = (type, record, name) => record ? action(name || record.title,'detail',type+':'+record.id,'outline') : '';
const nextBox = value => value ? '<div class="next-box"><strong>Next action</strong><p>'+e(value)+'</p></div>' : '';
const form = (kind, fields, id='', version='', label='Save changes') => '<form class="form-grid" data-form="'+e(kind)+'" data-id="'+e(id)+'" data-version="'+e(version)+'">'+
  fields+'<div class="form-message" role="status" aria-live="polite"></div><div class="actions"><button class="btn primary" type="submit">'+e(label)+'</button>'+action('Cancel','close','','outline')+'</div></form>';
const field = (label, name, value='', type='text', {required=false,wide=false,help='',attrs=''}={}) => '<label class="field '+(wide?'wide':'')+'"><span>'+e(label)+'</span>'+
  (type==='textarea'?'<textarea name="'+e(name)+'" '+(required?'required ':'')+attrs+'>'+e(value)+'</textarea>':'<input name="'+e(name)+'" type="'+e(type)+'" value="'+e(value)+'" '+(required?'required ':'')+attrs+'>')+
  (help?'<small>'+e(help)+'</small>':'')+'</label>';
const choice = (label,name,choices,value='', attrs='') => '<label class="field" '+attrs+'><span>'+e(label)+'</span>'+select(name,choices,value,label)+'</label>';
const multi = (label,name,choices,values=[]) => '<label class="field wide"><span>'+e(label)+'</span><select name="'+e(name)+'" multiple>'+choices.map(([value,label])=>'<option value="'+e(value)+'"'+(values.includes(value)?' selected':'')+'>'+e(label)+'</option>').join('')+'</select><small>Hold Ctrl or Command to select multiple people.</small></label>';
const checkbox = (label,name,checked) => '<label class="checkfield"><input type="checkbox" name="'+e(name)+'"'+(checked?' checked':'')+'>'+e(label)+'</label>';
const wideField = (label,name,value='',type='text',required=false) => field(label,name,value,type,{wide:true,required});
const reqField = (label,name,value='',type='text') => field(label,name,value,type,{required:true});
const hidden = (name,value) => '<input type="hidden" name="'+e(name)+'" value="'+e(value)+'">';
const options = (db, include = []) => db.users.filter(item=>item.active || include.includes(item.id)).map(item=>[item.id,item.name]);
const links = (db,actor) => [['','No linked record'],...['fixtures','projects'].flatMap(type=>visible(db,type,actor).map(record=>[record.id,record.title]))];
const linkType = id => String(id).startsWith('p-') ? 'projects' : 'fixtures';

export function formFor(db, actor, type, record = {}, extras = {}) {
  const isAdmin = admin(db,actor);
  const people = options(db,[record.owner,record.lead,...(record.supporting || []),...(record.members || [])]);
  if (type==='tasks') {
    const taskStates = record.id && !isAdmin && !record.personal ? statusList.filter(status=>status!=='Cancelled') : statusList;
    const link = record.link || extras.link || '';
    const owner = record.owner ?? (get(db,'fixtures',link)?.lead || get(db,'projects',link)?.lead || actor);
    const fields = wideField('Task title','title',record.title,'text',true)+wideField('Next action','next',record.next,'textarea',true)+
      choice('Status','status',taskStates,record.status || 'To do')+choice('Priority','priority',priorities,record.priority || 'Normal')+
      choice('Area','area',areas,record.area || (get(db,'projects',link)?'Trips':link?'Fixtures':'Operations'))+
      (isAdmin?choice('Owner','owner',[['','Unassigned'],...people],owner):'')+
      (isAdmin?choice('Linked record','link',links(db,actor),link)+choice('Deadline basis','basis',['Fixed','Fixture relative'],record.basis || 'Fixed'):'')+
      field('Due date','due',record.due,'date')+
      (isAdmin?field('Fixture deadline offset (days)','offset',record.offset ?? db.settings.prep,'number',{attrs:'data-only="relative"'}):hidden('basis',record.basis)+hidden('offset',record.offset))+
      wideField('Reason if undated','undated',record.undated)+
      (record.id?wideField('Reason for changing the due date','dueReason'):'')+
      '<div class="wide form-grid" data-only="Waiting">'+reqField('Waiting on','waiting',record.waiting)+reqField('Chase date','chase',record.chase,'date')+'</div>'+
      '<div class="wide form-grid" data-only="Done">'+wideField('Completion note','completion',record.completion,'textarea',true)+'</div>'+
      '<div class="wide form-grid" data-only="Cancelled">'+wideField('Cancellation reason','cancel',record.cancel,'textarea',true)+'</div>'+
      '<div class="wide form-grid" data-only="Needs review">'+wideField('Review reason','reviewReason',record.reviewReason,'textarea',true)+choice('Reviewer','reviewer',people,record.reviewer || actor)+'</div>'+
      (record.status==='Needs review'?'<div class="wide form-grid" data-only="resolved">'+wideField('How was it resolved?','reviewResolution',record.reviewResolution,'textarea',true)+'</div>':'')+
      wideField(record.requiresEvidence?'Evidence link (required on completion)':'Evidence link','evidence',record.evidence,'url')+
      (isAdmin?multi('Supporting staff','supporting',people,record.supporting)+checkbox('Inherit fixture lead','inherit',record.inherit):'');
    return form('task',fields,record.id,record.version,record.id?'Save task':'Create task');
  }
  if (type==='fixtures') {
    const open = db.tasks.filter(row=>row.link===record.id&&!closed(row));
    const fields = wideField('Fixture title','title',record.title,'text',true)+reqField('Sport','sport',record.sport)+reqField('Team or age group','team',record.team)+
      field('Competition','competition',record.competition)+field('Opponent','opponent',record.opponent)+reqField('Fixture date','date',record.date,'date')+
      field('Venue','venue',record.venue)+field('Start time','start',record.start,'time')+field('Finish time','end',record.end,'time')+
      field('Meeting point','meeting',record.meeting)+field('Meeting time','meetingTime',record.meetingTime,'time')+
      choice('Transport','transport',logistics,record.transport || 'Unknown')+field('Participant count','participants',record.participants,'number',{attrs:'min="0" step="1"'})+
      wideField('Next action','next',record.next,'textarea',true)+
      (isAdmin?choice('Lead coach','lead',[['','Unassigned'],...people],record.lead)+choice('Status','status',fixtureStates,record.status || 'Planning')+
        multi('Supporting coaches','supporting',people,record.supporting)+checkbox('Source review complete','reviewed',record.reviewed)+
        field('Source weekday','weekday',record.weekday)+wideField('Unresolved source conflict','conflict',record.conflict)+wideField('Source reference','source',record.source)+
        '<div class="wide form-grid" data-only="Cancelled">'+wideField('Cancellation reason','cancelReason',record.cancelReason,'textarea',true)+
        choice('Linked open tasks','linkedAction',[['retain','Keep open tasks'],['cancel','Cancel open tasks']],'retain')+
        '<p class="hint wide">'+open.length+' open '+(open.length===1?'task':'tasks')+(open.length?' · '+e(open.map(row=>row.title).join(', ')):'')+'</p></div>'+
        (!record.id?checkbox('Generate preparation checklist for review','checklist',true):''):'');
    return form('fixture',fields,record.id,'',record.id?'Save fixture':'Create fixture');
  }
  if (type==='projects') {
    return form('project',wideField('Project title','title',record.title,'text',true)+
      choice('Type','kind',['Project','Trip'],record.kind || 'Project')+
      (isAdmin?choice('Status','status',projectStates,record.status || 'Planning')+choice('Lead','lead',people,record.lead || actor):'')+
      field('Start date','start',record.start,'date')+field('End date','end',record.end,'date')+
      field('Aggregate budget estimate (RM)','budget',record.budget,'number',{attrs:'min="0" step="0.01"'})+
      wideField('Next action','next',record.next,'textarea',true)+wideField('Source link','source',record.source,'url')+
      (isAdmin?multi('Collaborators','members',people,record.members)+
        '<div class="wide form-grid" data-only="Cancelled">'+wideField('Cancellation reason','reason','','textarea',true)+'</div>':''),record.id,'',record.id?'Save project':'Create project');
  }
  if (type==='requests') {
    if (record.id) return form('request-review',choice('Status','status',requestStates,record.status)+wideField('Decision note','decision',record.decision,'textarea'),record.id);
    return form('request',wideField('Request title','title','','text',true)+choice('Category','category',['Equipment','Facility','Operations'],'Equipment')+
      choice('Priority','priority',priorities,'Normal')+wideField('Description','description','','textarea',true)+
      field('Estimated cost (RM)','estimate','','number',{attrs:'min="0" step="0.01"'})+field('Evidence link','evidence','','url'),'','','Submit request');
  }
  if (type==='results') {
    return form('result',wideField('Result title','title',record.title,'text',true)+choice('Fixture or project','link',links(db,actor),record.link || extras.link || '')+
      reqField('Outcome','outcome',record.outcome)+field('Placing','placing',record.placing)+wideField('Short summary','summary',record.summary,'textarea',true)+
      field('Approved student reference (optional)','reference',record.reference)+choice('Photo permission','photo',['Unknown','Not granted','Granted','Not required'],record.photo || 'Unknown')+
      wideField('Evidence link','evidence',record.evidence,'url'),record.id,'',record.id?'Save result':'Submit for review');
  }
  if (type==='documents') {
    return form('document',wideField('Document title','title',record.title,'text',true)+choice('Area','area',areas,record.area || 'Operations')+
      choice('Owner','owner',people,record.owner || actor)+wideField('Authoritative Drive URL','url',record.url,'url',true)+field('Review date','review',record.review,'date')+
      choice('Project access','project',[['','Department'],...db.projects.map(item=>[item.id,item.title])],record.project)+
      wideField('Review trigger','trigger',record.trigger,'textarea',true)+
      (record.flag?checkbox('Clear link flag','clear',false):''),record.id,'',record.id?'Save document':'Add document');
  }
  if (type==='staff') {
    return form('staff',reqField('Display name','name',record.name)+reqField('Approved email','email',record.email,'email')+
      choice('Role','role',[['staff','Staff member'],['admin','Administrator']],record.role || 'staff')+
      checkbox('Active demo account','active',record.active ?? true)+wideField('Responsibilities','responsibilities',record.responsibilities,'textarea')+
      (record.active?choice('Reassign active work if disabled','replacement',[['','Choose if disabling'],...people.filter(([id])=>id!==record.id)],''):''),record.id,'',record.id?'Save account':'Add demo account');
  }
  return '';
}

const rowLink = (type, record, note='') => '<button class="record-row" type="button" data-action="detail" data-value="'+e(type+':'+record.id)+'"><span class="record-copy"><strong>'+e(record.title)+'</strong>'+(note?'<small>'+e(note)+'</small>':'')+'</span>'+icon('right',16)+'</button>';
const event = (title,subtitle,note='') => '<div class="event-line"><strong>'+e(title)+'</strong><small>'+e(subtitle)+'</small>'+(note?'<p>'+e(note)+'</p>':'')+'</div>';
const history = (db, actor, id) => admin(db,actor) ? section('Audit history',db.activity.filter(item=>item.record===id).slice(0,12).map(item=>event(item.action,ownerName(db,item.actor)+' · '+stamp(item.time),item.description)).join('') || '<p class="hint">No changes recorded yet.</p>') : '';

export function detailFor(db, actor, type, record) {
  const isAdmin = admin(db,actor);
  const edit = action('Edit details','edit',type+':'+record.id,'outline');
  if (type==='tasks') {
    const related=parent(db,record.link);
    const who=record.owner===actor || isAdmin;
    const notes=record.comments.map(item=>event(item.reassignment?'Reassignment requested':ownerName(db,item.actor),stamp(item.time),item.text)).join('');
    return nextBox(record.next)+details([
      ['Owner',empty(ownerName(db,record.owner))],['Status',tag(record.status)+(overdue(record)?' '+tag('Overdue','urgent'):'')],['Deadline',record.due?dateLabel(record.due):'Needs a date'],['Priority',tag(record.priority)],
      ['Area',empty(record.area)],['Last updated',stamp(record.updated)],['Supporting staff',empty(record.supporting.map(id=>ownerName(db,id)).join(', '))],['Deadline basis',empty(record.basis)],
      ...(record.undated&&!record.due?[['Undated reason',e(record.undated)]]:[]),
      ...(record.status==='Waiting'?[['Waiting on',e(record.waiting)],['Chase date',dateLabel(record.chase)]]:[]),
      ...(record.status==='Needs review'?[['Review reason',e(record.reviewReason)],['Reviewer',e(ownerName(db,record.reviewer))]]:[]),
      ...(record.completed?[['Completed',stamp(record.completed)],['Completion note',e(record.completion)]]:[]),
      ...(record.cancel&&record.status==='Cancelled'?[['Cancellation reason',e(record.cancel)]]:[]),
      ...(record.sourceId?[['Source ID',e(record.sourceId)]]:[])
    ])+buttons(who?action('Update task','edit','tasks:'+record.id,'primary'):tag('Supporting'),recordButton(linkType(record.link),related),record.evidence?sourceLink(record.evidence):'',
      isAdmin&&record.comments.some(note=>note.reassignment&&note.time>String(record.reassignmentResolved||''))?action('Resolve reassignment','resolve-reassignment',record.id,'outline'):'')+
    section('Progress notes',notes || '<p class="hint">No progress notes yet.</p>')+
    form('comment',wideField('Add a progress note','note','','textarea',true)+(!isAdmin?checkbox('Request reassignment from Mark','reassign',false):''),record.id,'','Post note')+history(db,actor,record.id);
  }
  if (type==='fixtures') {
    const flags=fixtureFlags(db,record);
    const linked=visible(db,'tasks',actor).filter(task=>task.link===record.id);
    return (flags.length?'<p class="warning">'+e(flags.join(' · '))+'</p>':'')+nextBox(record.next)+details([
      ['Lead coach',e(ownerName(db,record.lead))],['Status',tag(record.status)],['Date',dateLabel(record.date,{weekday:'short',day:'numeric',month:'short',year:'numeric'})],
      ['Time',empty([record.start,record.end].filter(Boolean).join('–'))],['Venue',empty(record.venue,'To confirm')],['Sport and team',empty(record.sport+' · '+record.team)],
      ['Competition',empty(record.competition)],['Opponent',empty(record.opponent)],['Meeting',empty([record.meeting,record.meetingTime].filter(Boolean).join(' · '))],
      ['Transport',empty(record.transport,'Unknown')],['Participants',e(record.participants || '—')],['Last updated',stamp(record.updated)],
      ['Supporting coaches',empty(record.supporting.map(id=>ownerName(db,id)).join(', '))],['Source',empty(record.source)],['Source review',record.reviewed?'Reviewed':'Pending'],
      ...(record.conflict?[['Conflict note',e(record.conflict)]]:[]),...(record.sourceId?[['Source ID',e(record.sourceId)]]:[])
    ])+buttons(isAdmin||record.lead===actor?edit:'',isAdmin&&record.status!=='Cancelled'?action('Generate checklist','checklist',record.id,'primary'):'',
    record.status!=='Cancelled'?action('Record result','new-related','results:'+record.id,'outline'):'',isAdmin&&record.status!=='Cancelled'?action('Add linked task','new-related','tasks:'+record.id,'outline'):'')+
    section('Linked tasks',linked.map(task=>rowLink('tasks',task,task.status+' · '+ownerName(db,task.owner))).join('') || '<p class="hint">No visible linked tasks.</p>')+
    section('Results',visible(db,'results',actor).filter(row=>row.link===record.id).map(row=>rowLink('results',row,row.outcome)).join('') || '<p class="hint">No results recorded.</p>')+history(db,actor,record.id);
  }
  if (type==='projects') {
    const pending=record.milestones.filter(item=>item.mandatory&&!item.done).length;
    const linked=visible(db,'tasks',actor).filter(task=>task.link===record.id);
    const restricted=visible(db,'documents',actor).filter(doc=>doc.project===record.id);
    const active=record.status!=='Cancelled';
    return nextBox(record.next)+details([
      ['Lead',e(ownerName(db,record.lead))],['Status',tag(record.status)],['Window',dateLabel(record.start)+' – '+dateLabel(record.end)],
      ['Collaborators',empty(record.members.map(id=>ownerName(db,id)).join(', '))],['Aggregate estimate',money(record.budget)],['Last updated',stamp(record.updated)],
      ['Source',sourceLink(record.source,'Open source')],['Readiness',pending?pending+' mandatory steps open':'Mandatory steps complete']
    ])+buttons(edit,active&&isAdmin?action('Add linked task','new-related','tasks:'+record.id,'outline'):'',active?action('Record result','new-related','results:'+record.id,'outline'):'')+
    section('Milestones',record.milestones.map(item=>'<div class="line-item"><div><strong>'+e(item.title)+'</strong><small>'+(item.mandatory?'Mandatory':'Optional')+' · '+(item.done?'Complete':'Open')+'</small></div>'+
      (active?action(item.done?'Reopen':'Mark complete','milestone',record.id+':'+item.id,'outline'):'')+'</div>').join('')+
      (active?action('Add milestone','project-form',record.id+':milestone','subtle','plus'):'')+(record.milestones.length?'':'<p class="hint">No milestones added.</p>'))+
    section('Approvals and decisions',record.decisions.map(item=>event(item.note,ownerName(db,item.by)+' · '+dateLabel(item.date))+ (item.evidence?sourceLink(item.evidence):'')).join('')+
      (active&&isAdmin?action('Record approval','project-form',record.id+':decision','subtle','plus'):''))+
    section('Payment milestones',record.payments.map((item,index)=>'<div class="line-item"><div><strong>'+e(item.title)+'</strong><small>'+money(item.amount)+' · '+dateLabel(item.date)+' · '+(item.paid?'Recorded as paid':'Open')+'</small></div>'+
      (active&&isAdmin?action(item.paid?'Reopen':'Record as paid','payment',record.id+':'+index,'outline'):'')+'</div>').join('')+
      (active&&isAdmin?action('Add payment milestone','project-form',record.id+':payment','subtle','plus'):''))+
    section('Linked records',([...linked.map(row=>rowLink('tasks',row,row.status)),...restricted.map(row=>rowLink('documents',row,row.area))].join('') || '<p class="hint">No visible linked records.</p>'))+history(db,actor,record.id);
  }
  if (type==='requests') {
    const task=visible(db,'tasks',actor).find(item=>item.id===record.task);
    return '<p>'+e(record.description)+'</p>'+nextBox(record.decision)+details([
      ['Requester',e(ownerName(db,record.requester))],['Status',tag(record.status)],['Category',e(record.category)],['Priority',tag(record.priority)],['Estimate',record.estimate?money(record.estimate):'—'],
      ['Approver',empty(record.approver?ownerName(db,record.approver):'')],['Last updated',stamp(record.updated)],['Evidence',sourceLink(record.evidence)]
    ])+buttons(isAdmin?action('Review request','edit','requests:'+record.id,'primary'):'',isAdmin&&!record.task&&['Approved','In progress','Resolved'].includes(record.status)?action('Create linked task','request-task',record.id,'outline'):'',recordButton('tasks',task))+history(db,actor,record.id);
  }
  if (type==='results') {
    const subject=parent(db,record.link);
    return '<p>'+e(record.summary)+'</p>'+details([
      ['Outcome',empty(record.outcome)],['Placing',empty(record.placing)],['Recorded by',e(ownerName(db,record.author))],['Coach reviewer',empty(record.reviewer?ownerName(db,record.reviewer):'')],
      ['Recognition state',tag(record.celebration)],['Photo permission',empty(record.photo)],['Last updated',stamp(record.updated)],['Evidence',sourceLink(record.evidence)],
      ...(record.reference?[['Student reference',e(record.reference)]]:[]),...(record.reviewNote?[['Review note',e(record.reviewNote)]]:[])
    ])+buttons(isAdmin||record.author===actor?edit:'',isAdmin||subject?.lead===actor?action('Review recognition','result-review',record.id,'primary'):'',recordButton(linkType(record.link),subject))+history(db,actor,record.id);
  }
  if (type==='documents') {
    return details([
      ['Owner',e(ownerName(db,record.owner))],['Status',record.flag?tag('Link flagged'):tag('Listed')],['Area',e(record.area)],['Review date',dateLabel(record.review)],['Last updated',stamp(record.updated)],['Source',sourceLink(record.url,'Open in Drive')]
    ])+nextBox(record.trigger)+(record.flag?'<p class="warning">'+e(record.flag)+'</p>':'')+
    buttons(isAdmin?edit:'',recordButton('projects',get(db,'projects',record.project)))+
    section('Report a link issue',form('document-flag',wideField('What happened?','flag','','textarea',true),record.id,'','Flag link'))+history(db,actor,record.id);
  }
  if (type==='staff') {
    return details([
      ['Email',e(record.email)],['Role',record.role==='admin'?'Administrator':'Staff member'],['Access',tag(record.active?'Active':'Disabled')],
      ['Responsibilities',empty(record.responsibilities)],['Owned open tasks',String(db.tasks.filter(task=>task.owner===record.id&&!closed(task)).length)]
    ])+buttons(edit)+history(db,actor,record.id);
  }
  return '';
}

export function smallForm(kind, db, record = {}, phase = '') {
  if(kind==='result-review')return form(kind,choice('Recognition state','celebration',['In review','Approved','Hold'],record.celebration)+
    wideField('Coach review note','reviewNote',record.reviewNote,'textarea',true),record.id,'','Save review');
  if(kind==='settings')return form(kind,field('Last verified date','verified',db.settings.verified,'date')+
    field('Fixture prep offset (days)','prep',db.settings.prep,'number',{required:true,attrs:'min="0" max="365"'}),'','','Save settings');
  if(kind==='restore')return form(kind,'<p class="hint wide">The backup replaces local demo data in this browser.</p>'+
    field('Backup file','file','','file',{required:true,wide:true,attrs:'accept=".json,application/json"'}),'','','Restore demo data');
  if(kind==='import')return form('preview-import','<p class="hint wide">Upload a JSON snapshot or preview the invented sample. Unresolved rows stay in review.</p>'+
    field('Snapshot file','file','','file',{required:true,wide:true,attrs:'accept=".json,application/json"'}),'','','Preview file');
  if(kind==='template')return form(kind,wideField('Task title','title',record.title,'text',true)+wideField('Next action','next',record.next,'textarea',true)+
    choice('Cadence','cadence',['Weekly','Termly'],record.cadence || 'Weekly')+choice('Owner','owner',options(db,[record.owner]),record.owner || 'mark')+
    reqField('Start date','start',record.start || today(),'date')+checkbox('Active template','active',record.active ?? true), record.id,'','Save template');
  if(kind==='project-sub') {
    const fields={
      milestone:wideField('Milestone title','title','','text',true)+checkbox('Mandatory for readiness','mandatory',true),
      decision:wideField('Approval or decision note','note','','textarea',true)+reqField('Decision date','date',today(),'date')+wideField('Evidence link','evidence','','url',true),
      payment:wideField('Milestone title','title','','text',true)+reqField('Target date','date','','date')+field('Aggregate amount (RM)','amount','','number',{required:true,attrs:'min="0" step="0.01"'})
    };
    return form(kind,hidden('phase',phase)+fields[phase],record.id,'','Save '+phase);
  }
  return '';
}

export function bindConditions(node) {
  const update = () => {
    const {status,basis}=node.elements;
    for(const group of node.querySelectorAll('[data-only]')) {
      const mode=group.dataset.only;
      const show=mode==='relative'?basis?.value==='Fixture relative':mode==='resolved'?status?.value!=='Needs review':status?.value===mode;
      group.hidden=!show;
      for(const control of group.querySelectorAll('input, select, textarea'))control.disabled=!show;
    }
  };
  update();
  node.addEventListener('change',update);
}
