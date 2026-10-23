import { DetectiveCase } from '../../types';

export const DETECTIVE_CASES: DetectiveCase[] = [
  {
    id: 'case-cyanide-sonata',
    title: 'The Cyanide Sonata',
    category: 'Detective Mysteries',
    mode: 'detective',
    difficulty: 'Medium',
    description: 'A world-renowned maestro collapses during intermission. Only four people had backstage access.',
    estimatedTime: '7-10 min',
    playsCount: 4520,
    rating: 4.9,
    victim: 'Maestro Julian Vance (Conductor & Virtuoso)',
    crimeScene: 'Backstage Dressing Room 4, Royal Symphony Hall',
    briefing: `At 8:38 PM during the intermission of Brahms' Symphony No. 1, Maestro Julian Vance collapsed in his locked dressing room clutching his throat. Emergency responders pronounced him dead on the scene. Toxicology confirmed a lethal dose of fast-acting potassium cyanide. 

No sign of forced entry. The Earl Grey tea on his desk was tested, but returned completely negative for poison. Where was the cyanide delivered, and who among the four people backstage orchestrated his final performance?`,
    suspects: [
      {
        id: 'suspect-elena',
        name: 'Elena Rostova',
        role: 'Rival First Violinist & Concertmaster',
        avatar: '🎻',
        statement: 'Julian was brilliant, but an unbearable egomaniac. Yes, we had professional friction, but I would never murder him. I only went to his dressing room for two minutes to return his custom brass mouthpiece and embouchure wax.',
        alibi: 'Claims she was in the rehearsal corridor tuning her violin from 8:31 PM until the alarm sounded.',
        interrogationNotes: [
          'Interviewer: "Why did you have Julian\'s personal mouthpiece?" -> Elena: "He loaned it to me yesterday to demonstrate an acoustic overblowing technique. I returned it at 8:29 PM so he could warm up for the trumpet solo in Part II."',
          'Interviewer: "Do you play brass?" -> Elena: "I am a multi-instrumentalist. Everyone knows I keep bees as an eccentric hobby in the countryside."',
          'Interviewer: "Were you passed over for the European tour conductor role?" -> Elena: "Julian blocked my promotion with the board. But I had already received an offer from Vienna."'
        ]
      },
      {
        id: 'suspect-arthur',
        name: 'Arthur Pendelton',
        role: 'Business Manager & Royalties Agent',
        avatar: '💼',
        statement: 'Julian was my golden goose! Why on earth would I kill him? We had a heated dispute at 8:12 PM over our European contract percentages, but Julian signed the agreement before the intermission.',
        alibi: 'Stands by his claim that he was drinking whiskey in the VIP lounge bar from 8:20 PM onward, verified by the bartender.',
        interrogationNotes: [
          'Interviewer: "We found your fingerprints on the tea saucer." -> Arthur: "I brought him his tea at 8:10 PM before the concert started. The forensic report cleared the tea anyway!"',
          'Interviewer: "Julian recently audited your offshore accounts." -> Arthur: "He was paranoid about everyone. There was nothing fraudulent."'
        ]
      },
      {
        id: 'suspect-clara',
        name: 'Clara Vance',
        role: 'Estranged Daughter & Section Cellist',
        avatar: '🎼',
        statement: 'My father was distant and demanding. He cut me out of his will six months ago when I refused to play classical repertoire exclusively.',
        alibi: 'Was seen by two stagehands warming up in the orchestra pit during the entire intermission.',
        interrogationNotes: [
          'Interviewer: "Did you visit his dressing room tonight?" -> Clara: "No. I haven\'t set foot in his dressing room in three seasons."',
          'Interviewer: "Did you know about his updated will?" -> Clara: "He made it clear I wouldn\'t receive a dime unless I submitted to his authority."'
        ]
      },
      {
        id: 'suspect-marcus',
        name: 'Marcus Webb',
        role: 'Chief Audio Engineer',
        avatar: '🎧',
        statement: 'I was in the control booth adjusting the ceiling microphone levels during the intermission.',
        alibi: 'Electronic booth logs show continuous console audio input adjustments between 8:25 PM and 8:40 PM.',
        interrogationNotes: [
          'Interviewer: "Did you replace the dressing room intercom?" -> Marcus: "Yes, yesterday morning. Standard maintenance."',
          'Interviewer: "Did you have any personal quarrel with Vance?" -> Marcus: "He yelled at everyone about room reverb, but that was just Julian."'
        ]
      }
    ],
    evidence: [
      {
        id: 'ev-mouthpiece',
        name: 'Custom Brass Mouthpiece & Embouchure Wax',
        type: 'forensic',
        shortDesc: 'A vintage gold-plated mouthpiece found beside Julian\'s hand.',
        fullAnalysis: 'Forensic Lab report: The inner rim of the mouthpiece was coated with bee-wax mixed with concentrated potassium cyanide crystals. The poison was absorbed instantaneously through Vance\'s chapped lips and mucous membrane as soon as he attempted to play.',
        locationFound: 'On the dressing room floor next to Vance\'s right hand.'
      },
      {
        id: 'ev-tea',
        name: 'Dressing Room Earl Grey Tea',
        type: 'forensic',
        shortDesc: 'Half-empty cup of Earl Grey tea sitting on the wooden vanity table.',
        fullAnalysis: 'Chemical spectrophotometry test: 100% negative for all toxins, cyanides, or sedatives. The tea was harmless.',
        locationFound: 'Julian\'s dressing room vanity desk.'
      },
      {
        id: 'ev-cardlogs',
        name: 'RFID Dressing Room Electronic Access Logs',
        type: 'digital',
        shortDesc: 'Electronic entry record for Room 4 between 8:00 PM and 8:40 PM.',
        fullAnalysis: `8:09 PM - Arthur Pendelton (Keycard 04) - Entry logged.
8:14 PM - Arthur Pendelton - Exit logged.
8:25 PM - Julian Vance - Entry logged (Intermission).
8:29 PM - Elena Rostova (Keycard 02) - Entry logged.
8:31 PM - Elena Rostova - Exit logged.
No further entries until 8:39 PM emergency breach.`,
        locationFound: 'Security Mainframe Server.'
      },
      {
        id: 'ev-beekeeper',
        name: 'Artisan Apiculture Invoice',
        type: 'document',
        shortDesc: 'Receipt for chemical wax-solvents and beekeeping supplies.',
        fullAnalysis: 'An invoice addressed to "E. Rostova" from an agricultural chemical supplier for organic beeswax binding agents and volatile carrier agents.',
        locationFound: 'Tucked inside a violin case in the VIP green room.'
      },
      {
        id: 'ev-scores',
        name: 'Annotated Symphony Score',
        type: 'physical',
        shortDesc: 'Sheet music showing an unusual solo trumpet passage in Movement 2.',
        fullAnalysis: 'Vance had personally penciled in: "Julian warm up on high C with custom mouthpiece before 8:40 bell". Whoever knew his performance ritual knew he would play the mouthpiece immediately upon entering the room.',
        locationFound: 'On the music stand.'
      }
    ],
    timeline: [
      { time: '8:09 PM', event: 'Arthur Pendelton enters Vance\'s room with tea; heated discussion overheard.', witness: 'Stage Security Guard', verified: true },
      { time: '8:14 PM', event: 'Arthur leaves dressing room and enters VIP lounge bar.', witness: 'Lounge Bartender', verified: true },
      { time: '8:25 PM', event: 'Intermission bell chimes. Maestro Vance retires to Dressing Room 4.', witness: 'Stagehands', verified: true },
      { time: '8:29 PM', event: 'Elena Rostova enters Vance\'s room carrying a small velvet pouch.', witness: 'Security RFID Log', verified: true },
      { time: '8:31 PM', event: 'Elena Rostova exits dressing room alone.', witness: 'Security RFID Log', verified: true },
      { time: '8:36 PM', event: 'Muffled brass note heard from Room 4, followed by a sudden thud.', witness: 'Corridor Custodian', verified: true },
      { time: '8:38 PM', event: 'Door forced open by security; Maestro Vance found deceased.', witness: 'Emergency Responders', verified: true }
    ],
    culpritId: 'suspect-elena',
    decisiveEvidenceIds: ['ev-mouthpiece', 'ev-beekeeper'],
    motiveChoiceId: 'motive-career-revenge',
    motiveChoices: [
      { id: 'motive-career-revenge', text: 'Revenge for sabotaging her European conductor appointment and using her beekeeping expertise to synthesize cyanide-infused lip wax.', isCorrect: true },
      { id: 'motive-inheritance', text: 'To claim the maestro\'s life insurance and fortune through inheritance.', isCorrect: false },
      { id: 'motive-royalty', text: 'To terminate a disputed recording royalty contract with the orchestra.', isCorrect: false }
    ],
    inspectorVerdict: 'Guilty: Elena Rostova',
    solutionBreakdown: `Inspector's Deductive Breakdown:
1. The Method: The tea was completely clean. The cyanide was coated onto Julian's custom brass horn mouthpiece using beeswax, which Elena Rostova produces from her country apiary (verified by the agricultural invoice in her violin case).
2. The Opportunity: The RFID security logs prove Elena was the ONLY person to visit Vance's room during intermission (8:29 PM - 8:31 PM), handing him the poisoned mouthpiece directly under the guise of "returning" it.
3. The Mechanism: Knowing Vance's ritual of playing a warm-up high C note at 8:35 PM before Movement 2, Elena knew the poison wax would immediately contact his mucous membranes.
4. Innocent Parties:
   - Arthur Pendelton left before intermission began and was with the bartender; the tea he brought tested negative.
   - Clara Vance was observed continuously in the orchestra pit by multiple stagehands.
   - Marcus Webb was physically logged into the audio console adjustments at the sound booth throughout intermission.`
  },
  {
    id: 'case-blackwood-heist',
    title: 'The Blackwood Vault Heist',
    category: 'Detective Mysteries',
    mode: 'detective',
    difficulty: 'Hard',
    description: 'A 50-carat blue sapphire vanished from a subterranean vault during a thunderstorm.',
    estimatedTime: '8-12 min',
    playsCount: 3280,
    rating: 4.9,
    victim: 'Lord Alistair Blackwood (Victim of Grand Larceny)',
    crimeScene: 'Subterranean Vault, Blackwood Manor',
    briefing: `During a severe thunderstorm at Blackwood Manor, the estate\'s power flickered at 11:42 PM. When backup generators kicked in four minutes later, the alarm shrieked. The 50-carat Archduke Sapphire was gone from its pressurized glass pedestal.

The vault door was unlocked from the outside with a clean 6-digit master passcode. The reinforced display case was shattered, but strangely, all glass shards lay SCATTERED OUTWARD, not inward. Four guests were staying in the manor that night. Who stole the sapphire and how?`,
    suspects: [
      {
        id: 'suspect-reed',
        name: 'Dr. Evelyn Reed',
        role: 'Independent Insurance Appraiser',
        avatar: '💎',
        statement: 'I conducted the official appraisal of the sapphire at 4:00 PM yesterday afternoon, certified its authenticity, and returned it to the pedestal. I was asleep in the West Guest Wing when the alarm sounded.',
        alibi: 'West wing room door was locked from the inside during the storm.',
        interrogationNotes: [
          'Interviewer: "Did you notice any flaws in the sapphire?" -> Dr. Reed: "None. It was perfection—or at least the stone I examined was."',
          'Interviewer: "Why do you carry high-density cubic zirconia replicas in your travel kit?" -> Dr. Reed: "Standard appraisal comparison stones. Every certified gemologist carries calibration specimens."'
        ]
      },
      {
        id: 'suspect-godfrey',
        name: 'Godfrey Sterling',
        role: 'Head Butler of Blackwood Manor',
        avatar: '🎩',
        statement: 'I have served the Blackwood family for 34 years. I alone held the master vault passcode, which I never wrote down. I was preparing tea in the downstairs pantry when the power died.',
        alibi: 'Pantry electric kettle was still steaming when officers arrived.',
        interrogationNotes: [
          'Interviewer: "Did anyone ask you about the passcode?" -> Godfrey: "Only Lord Blackwood himself. However, Dr. Reed did watch me enter it during the afternoon inspection."'
        ]
      },
      {
        id: 'suspect-victor',
        name: 'Victor Kane',
        role: 'Security Vault Architect',
        avatar: '🔧',
        statement: 'I designed the biometric sensors. If anyone bypassed my electronic locks, they had to be an elite cyber thief. I was in the library reading by candlelight.',
        alibi: 'Found sitting in the library armchair when guards swept the mansion.',
        interrogationNotes: [
          'Interviewer: "Why were the thermal sensors offline?" -> Victor: "The lightning surge overloaded the primary backup switchboard."'
        ]
      },
      {
        id: 'suspect-julian-b',
        name: 'Julian Blackwood',
        role: 'Nephew and Heavily Indebted Heir',
        avatar: '🎲',
        statement: 'Yes, I owe 400,000 pounds in casino debts in Macau. But stealing from my uncle would get me disinherited immediately. I was watching the storm from the veranda.',
        alibi: 'Damp jacket found hanging in the mudroom.',
        interrogationNotes: [
          'Interviewer: "Your coat was soaked with rain." -> Julian: "I stepped outside on the veranda for a cigar right when the lightning struck."'
        ]
      }
    ],
    evidence: [
      {
        id: 'ev-glass-direction',
        name: 'Shattered Display Glass Physics',
        type: 'forensic',
        shortDesc: 'Detailed forensic assessment of the glass fragmentation pattern.',
        fullAnalysis: 'High-speed blast and impact analysis shows 98% of the shattered glass fragments landed on the floor OUTSIDE the pedestal perimeter. This proves conclusively that an explosive or concussive force originated FROM WITHIN the display case, not from someone smashing it in from the outside.',
        locationFound: 'Around the vault pedestal.'
      },
      {
        id: 'ev-thermal-camera',
        name: 'Thermal Camera Log (Surge Battery)',
        type: 'digital',
        shortDesc: 'A brief 3-second thermal snapshot before full power outage.',
        fullAnalysis: 'Thermal imaging at 11:41 PM (one minute BEFORE power failure) shows the glass case was ALREADY EMPTY. The gem was removed long before the power cut!',
        locationFound: 'Security Sub-Station.'
      },
      {
        id: 'ev-replica-residue',
        name: 'Chemical Residue on Pedestal Micro-Scale',
        type: 'physical',
        shortDesc: 'Residue swabbed from the weight-sensitive pedestal switch.',
        fullAnalysis: 'The pedestal was calibrated to 10.02 grams. Swabs revealed high-density leaded adhesive putty used to calibrate fake replica stones.',
        locationFound: 'Pedestal base.'
      }
    ],
    timeline: [
      { time: '4:00 PM', event: 'Dr. Evelyn Reed appraises the Archduke Sapphire inside the vault with Butler Godfrey present.', witness: 'Butler Godfrey', verified: true },
      { time: '4:30 PM', event: 'Vault locked; sapphire supposedly resting safely on its weight-sensitive pedestal.', witness: 'Lord Blackwood', verified: true },
      { time: '11:41 PM', event: 'Thermal camera records an empty display case prior to blackout.', witness: 'Automated DVR Log', verified: true },
      { time: '11:42 PM', event: 'Lightning strikes mansion lightning rod; main circuit breakers trip.', witness: 'Entire Household', verified: true },
      { time: '11:46 PM', event: 'Generators restore power; display case alarm triggers due to small timed explosive squib.', witness: 'Security Team', verified: true }
    ],
    culpritId: 'suspect-reed',
    decisiveEvidenceIds: ['ev-glass-direction', 'ev-thermal-camera'],
    motiveChoiceId: 'motive-swap-heist',
    motiveChoices: [
      { id: 'motive-swap-heist', text: 'She substituted the genuine sapphire with a lead-weighted replica at 4:00 PM during appraisal, then detonated a tiny internal squib to fake an exterior break-in.', isCorrect: true },
      { id: 'motive-blackmail', text: 'To blackmail Lord Blackwood over family tax evasion.', isCorrect: false },
      { id: 'motive-cyber', text: 'To prove that Victor Kane\'s security architecture was vulnerable.', isCorrect: false }
    ],
    inspectorVerdict: 'Guilty: Dr. Evelyn Reed',
    solutionBreakdown: `Inspector's Solution:
1. The Real Crime Time: The thermal camera proves the vault was already empty at 11:41 PM, before the storm outage!
2. The Glass Anomaly: The outward glass spray proved the explosion came from INSIDE the case—a tiny remote squib designed to shatter the glass and trigger the alarm during the power outage, creating an illusion of a night break-in.
3. The Switch: Dr. Evelyn Reed was the only person with hands-on physical access to the sapphire at 4:00 PM. She memorized Godfrey's code, replaced the sapphire with a weighted counterfeit, and slipped the real gem into her calibration briefcase.
4. Neither Julian nor Godfrey had the expertise or gemological tools to pull off the clean switch.`
  }
];
