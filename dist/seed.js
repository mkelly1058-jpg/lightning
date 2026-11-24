export const day = (value = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(value);

export function shift(date, days) {
  if (!date) return '';
  const timestamp = Date.parse(date + 'T12:00:00Z');
  return new Date(timestamp + days * 86400000).toISOString().slice(0, 10);
}

export const today = () => day();
export const due = days => shift(today(), days);
export const statusList = ['Needs review', 'To do', 'In progress', 'Waiting', 'Done', 'Cancelled'];
export const priorities = ['Low', 'Normal', 'High', 'Urgent'];
export const areas = ['Fixtures', 'Trips', 'Equipment', 'Curriculum', 'Development', 'Operations'];
export const requestStates = ['Submitted', 'Reviewing', 'Approved', 'Declined', 'In progress', 'Resolved'];
export const logistics = ['Unknown', 'Requested', 'Confirmed', 'Not required'];
export const fixtureStates = ['Needs review', 'Planning', 'Confirmed', 'Completed', 'Cancelled'];
export const projectStates = ['Planning', 'In progress', 'Waiting', 'Completed', 'Cancelled'];
export const iso = () => new Date().toISOString();
export const makeId = prefix => prefix + '-' + globalThis.crypto.randomUUID();

export const fixtureSteps = [
  ['Confirm fixture details and staffing', 'Verify timing, opponent and coach coverage.'],
  ['Check venue and transport', 'Confirm the venue booking and transport status.'],
  ['Verify school consent checks', 'Confirm consent and emergency information in the authorised school system.'],
  ['Communicate arrangements', 'Review approved arrangements with the team.'],
  ['Record the result', 'Add the final score and an optional evidence link.']
];

export const tripSteps = [
  'Trip approval', 'Quotation review', 'Staffing', 'Transport', 'Accommodation',
  'Parent communication', 'School consent checks', 'Payment milestone', 'Final readiness'
];

export function seed() {
  const users = [
    { id: 'mark', name: 'Mark Kelly', initials: 'MK', email: 'mark@example.invalid', role: 'admin', active: true, responsibilities: 'Department operations and approvals' },
    { id: 'alex', name: 'Alex Morgan', initials: 'AM', email: 'alex@example.invalid', role: 'staff', active: true, responsibilities: 'Athletics and fixture coordination' },
    { id: 'jordan', name: 'Jordan Lee', initials: 'JL', email: 'jordan@example.invalid', role: 'staff', active: true, responsibilities: 'Basketball and equipment' },
    { id: 'sam', name: 'Sam Tan', initials: 'ST', email: 'sam@example.invalid', role: 'staff', active: true, responsibilities: 'Football and trips' }
  ];
  const fixture = (id, title, sport, team, days, venue, start, end, lead, data = {}) => ({
    id, title, sport, team, date: due(days), venue, start, end, lead, supporting: [],
    competition: 'Inter-school series', opponent: 'School invitational', meeting: 'Sports hall entrance',
    meetingTime: '', transport: 'Not required', participants: 18, status: 'Confirmed',
    reviewed: true, updated: iso(), next: 'Confirm team attendance.', source: 'Manual source review', ...data
  });
  const fixtures = [
    fixture('f-athletics','District Athletics Meet','Athletics','U15 & U18',2,'Main Athletics Track','08:30','12:30','alex',{supporting:['jordan'],meetingTime:'08:00',opponent:'District schools'}),
    fixture('f-basketball','U15 Basketball Friendly','Basketball','U15',5,'Indoor Sports Hall','15:30','17:00','jordan',{opponent:'Westfield Academy'}),
    fixture('f-football','Inter-school Football Cup','Football','U18',9,'Central Sports Complex','09:00','13:30','',{status:'Needs review',reviewed:false,conflict:'Lead coach and venue booking need confirmation.',transport:'Requested',next:'Assign a lead coach.'}),
    fixture('f-swim','Relay Time Trials','Swimming','U15',12,'Aquatics Centre','14:00','16:00','sam',{status:'Planning',transport:'Unknown',next:'Check lane availability.'}),
    fixture('f-past','Track & Field Invitational','Athletics','U18',-10,'Main Athletics Track','08:00','12:00','alex',{status:'Completed',next:'Review the result.'})
  ];
  const projects = [
    {id:'p-camp', title:'Leadership Sports Camp', kind:'Trip', lead:'sam', members:['alex'], start:due(24), end:due(26), status:'In progress', next:'Confirm the transport quotation.', budget:2400, source:'', updated:iso(), milestones:tripSteps.map((title,index)=>({id:'m'+index,title,mandatory:true,done:index<2})), decisions:[{by:'mark',date:due(-2),note:'Reviewed the initial scope.',evidence:''}], payments:[{title:'Transport deposit',date:due(15),amount:500,paid:false}]},
    {id:'p-kit', title:'Equipment Inventory Refresh', kind:'Project', lead:'jordan', members:['mark'], start:due(-2), end:due(17), status:'Planning', next:'Confirm the list of equipment to inspect.', budget:900, source:'', updated:iso(), milestones:[{id:'kit-list',title:'Review inventory list',mandatory:true,done:false},{id:'kit-audit',title:'Complete physical count',mandatory:true,done:false}], decisions:[], payments:[]}
  ];
  const task = (id, title, next, owner, days, data = {}) => ({
    id, title, next, owner, due:days === null ? '' : due(days), basis:'Fixed', offset:14,
    priority:'Normal', status:'To do', area:'Fixtures', link:'', supporting:[], inherit:false,
    personal:false, comments:[], evidence:'', version:1, created:iso(), updated:iso(), editor:'mark', ...data
  });
  const tasks = [
    task('t-roster','Confirm athletics team roster','Check the U15 and U18 entry lists with the team leads.','alex',-2,{priority:'High',status:'In progress',link:'f-athletics'}),
    task('t-venue','Verify the venue and meeting point','Confirm track access with the venue coordinator.','alex',0,{priority:'High',link:'f-athletics'}),
    task('t-consent','Check fixture consent status','Verify the records in the authorised school system.','alex',0,{link:'f-athletics'}),
    task('t-kit','Prepare the basketball kit','Check match balls, bibs and the first-aid kit.','jordan',3,{supporting:['alex'],area:'Equipment',link:'f-basketball'}),
    task('t-bus','Review the camp transport quote','Follow up with the transport coordinator.','alex',4,{status:'Waiting',area:'Trips',link:'p-camp',waiting:'Transport coordinator',chase:due(2)}),
    task('t-drills','Draft the next warm-up block','Add a ten-minute relay drill.','alex',null,{personal:true,area:'Curriculum',undated:'Review at the next planning meeting.'}),
    task('t-lead','Allocate a football lead coach','Check availability before assigning the fixture.','',1,{status:'Needs review',priority:'Urgent',link:'f-football',reviewReason:'No coach listed in the sample source.',reviewer:'mark'}),
    task('t-budget','Prepare a camp budget','Record an aggregate estimate for approval.','sam',6,{area:'Trips',link:'p-camp'}),
    task('t-closed','Archive the invitational results','Attach the result record.','alex',-3,{status:'Done',link:'f-past',completion:'Outcome entered for coach review.',completed:iso()}),
    task('t-receipt','Check court booking','Wait for court confirmation from facilities.','jordan',-1,{status:'Waiting',area:'Operations',waiting:'Facilities',chase:due(1),link:'f-basketball'}),
    task('t-private','Review a coaching session outline','Review drills and timing for next week.','jordan',0,{personal:true,area:'Development'})
  ];
  return {
    schema:1, revision:1, users, fixtures, projects, tasks,
    requests:[
      {id:'q-bibs',title:'Replacement training bibs',requester:'alex',category:'Equipment',description:'Replace twelve worn bibs in the shared athletics kit.',priority:'Normal',estimate:180,status:'Submitted',evidence:'',decision:'',task:'',updated:iso()},
      {id:'q-court',title:'Extra indoor practice slot',requester:'jordan',category:'Facility',description:'Request an indoor court booking for the U15 team.',priority:'High',estimate:0,status:'Reviewing',evidence:'',decision:'',task:'',updated:iso()}
    ],
    documents:[
      {id:'d-fixture',title:'Fixture planning checklist',area:'Fixtures',owner:'alex',url:'',review:due(14),trigger:'Check after changes to venue or consent procedures.',flag:'',project:'',updated:iso()},
      {id:'d-kit',title:'Equipment issue register',area:'Equipment',owner:'jordan',url:'',review:due(21),trigger:'Review at the start of each term.',flag:'',project:'',updated:iso()},
      {id:'d-camp',title:'Sports camp planning brief',area:'Trips',owner:'sam',url:'',review:due(5),trigger:'Review whenever an itinerary is revised.',flag:'',project:'p-camp',updated:iso()}
    ],
    results:[{id:'r-track',title:'Track & Field Invitational',link:'f-past',outcome:'2nd overall',placing:'2nd',summary:'Four school teams competed across track and field events.',reference:'',photo:'Unknown',celebration:'In review',reviewer:'mark',author:'alex',evidence:'',updated:iso()}],
    notifications:[{id:'n-demo',key:'seed:alex',user:'alex',title:'Athletics roster check is overdue',record:'t-roster',created:iso(),read:false,snooze:''}],
    activity:[], imports:[], templates:[], settings:{prep:14,verified:'',jobs:{last:'',failed:'',runs:0}}
  };
}
