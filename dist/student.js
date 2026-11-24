import { due } from './seed.js';

// Curated, fictional records. This module has no dependency on department storage.
export function studentRecords() {
  return {
    events:[
      {id:'district-track',title:'District Athletics Meet',sport:'Athletics',team:'U15 & U18',date:due(2),time:'08:30',venue:'Main Athletics Track',meeting:'Sports hall entrance',arrive:'08:00',kit:'Team athletics kit, running shoes and a refillable water bottle.'},
      {id:'basketball-friendly',title:'U15 Basketball Friendly',sport:'Basketball',team:'U15',date:due(5),time:'15:30',venue:'Indoor Sports Hall',meeting:'Indoor Sports Hall',arrive:'15:00',kit:'Team jersey, indoor shoes and a refillable water bottle.'},
      {id:'relay-trials',title:'Relay Time Trials',sport:'Swimming',team:'U15',date:due(12),time:'14:00',venue:'Aquatics Centre',meeting:'Aquatics Centre reception',arrive:'13:30',kit:'Swim kit, cap, goggles and a towel.'}
    ],
    results:[
      {title:'Track & Field Invitational',sport:'Athletics',team:'U18',date:due(-10),outcome:'2nd overall',summary:'The Lightning team finished second across a full programme of track and field events.'},
      {title:'Lightning vs Ridgeview',sport:'Basketball',team:'U15',date:due(-13),outcome:'42–35 win',summary:'Lightning closed out the final quarter to win the home fixture.'}
    ]
  };
}
