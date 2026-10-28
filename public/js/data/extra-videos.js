// Three demonstration videos for every exercise: two technique videos and one
// short, focused clip. Bryan's own video, when there is one, stays first in the
// player and remains the default tab (see components/video.js).
//
// The short clip is marked with an end second (`e`) so it plays only the
// demonstration. Channel names and relative upload dates are kept here so the
// video tab can name the source without a second metadata file.

export const EXTRA_VIDEOS = {
  pogo: [
    { t: "Pogo Hops | Exercise Demonstration", u: "https://www.youtube.com/watch?v=EjwLFHvrHss", e: 24, c: "The Irish Physio TV", date: "2mo ago" },
  ],
  balance: [
    { t: "Single Leg Balance - Ask Doctor Jo", u: "https://www.youtube.com/watch?v=Dtgh2_LFkBQ", e: 25, c: "AskDoctorJo", date: "9y ago" },
  ],
  powerskip: [
    { t: "How To Do POWER SKIPS | Exercise Demonstration Video and Guide", u: "https://www.youtube.com/watch?v=iJGycGF-iQE", e: 40, c: "Live Lean TV Daily Exercises", date: "5y ago" },
  ],
  heidens: [
    { t: "Lateral Skater Jumps", u: "https://www.youtube.com/watch?v=Xz27DudBfSs", e: 13, c: "The Active Life", date: "5y ago" },
  ],
  woodchop: [
    { t: "Banded Woodchop", u: "https://www.youtube.com/watch?v=02q1lTCrLoc", e: 45, c: "Jenny LaBaw", date: "6y ago" },
  ],
  gobletsquat: [
    { t: "How To Do A DUMBBELL GOBLET SQUAT | Exercise Demonstration Video and Guide", u: "https://www.youtube.com/watch?v=Xjo_fY9Hl9w", e: 43, c: "Live Lean TV Daily Exercises", date: "10y ago" },
  ],
  poliquin: [
    { t: "Poliquin Step-Up | Olympic Weightlifting Exercise Library", u: "https://www.youtube.com/watch?v=VJWAb94U4SM", e: 45, c: "Catalyst Athletics", date: "2y ago" },
  ],
  atg: [
    { t: "ATG Split Squat", u: "https://www.youtube.com/watch?v=oVGns3iOxVw", e: 26, c: "Core Blend Training", date: "5y ago" },
  ],
  nordic: [
    { t: "Nordic Hamstring Curl", u: "https://www.youtube.com/watch?v=kjv4WQXWl_A", e: 15, c: "Onnit Academy", date: "6y ago" },
  ],
  revnordic: [
    { t: "Reverse Nordic", u: "https://www.youtube.com/watch?v=x2K8uH7dcqg", e: 22, c: "The Active Life", date: "5y ago" },
  ],
  tibraise: [
    { t: "Tibialis Wall Raises (Exercise Demo)", u: "https://www.youtube.com/watch?v=VzIcGAgBiaM", e: 26, c: "The Barefoot Sprinter", date: "4y ago" },
  ],
  rdl: [
    { t: "Dumbbell Romanian Deadlift", u: "https://www.youtube.com/watch?v=xAL7lHwj30E", e: 16, c: "Onnit Academy", date: "6y ago" },
  ],
  swing: [
    { t: "Dumbbell Swing", u: "https://www.youtube.com/watch?v=75vxU7AauRA", e: 10, c: "The Active Life", date: "4y ago" },
  ],
  lunge: [
    { t: "How To Reverse Lunge", u: "https://www.youtube.com/watch?v=xrPteyQLGAo", e: 15, c: "PureGym", date: "8y ago" },
  ],
  pushup: [
    { t: "How to do a Push-Up | Proper Form & Technique | NASM", u: "https://www.youtube.com/watch?v=WDIpL0pjun0", e: 14, c: "National Academy of Sports Medicine (NASM)", date: "5y ago" },
  ],
  row: [
    { t: "How To Do Single Arm Dumbbell Rows", u: "https://www.youtube.com/watch?v=ZRSGpBUVcNw", e: 11, c: "PureGym", date: "3y ago" },
  ],
  ohpress: [
    { t: "The Perfect Overhead Dumbbell Press", u: "https://www.youtube.com/watch?v=M2rwvNhTOu0", e: 45, c: "3v", date: "14y ago" },
  ],
  floorpress: [
    { t: "How To Do A DUMBBELL FLOOR PRESS | Exercise Demonstration Video and Guide", u: "https://www.youtube.com/watch?v=qHCI9rK7HqM", e: 45, c: "Live Lean TV Daily Exercises", date: "5y ago" },
  ],
  triceps: [
    { t: "Standing overhead dumbbell triceps extension", u: "https://www.youtube.com/watch?v=-Vyt2QdsR7E", e: 45, c: "ScottHermanFitness", date: "17y ago" },
  ],
  curl: [
    { t: "How to Perform Standing Dumbbell Bicep Curls", u: "https://www.youtube.com/watch?v=6DeLZ6cbgWQ", e: 28, c: "Chris McCarthy", date: "1y ago" },
    { t: "Bicep Curls — (DUMBBELL FORM & TECHNIQUE)", u: "https://www.youtube.com/watch?v=XE_pHwbst04", c: "Fit Father Project - Fitness For Busy Fathers", date: "7y ago" },
  ],
  fly: [
    { t: "Banded Chest Fly", u: "https://www.youtube.com/watch?v=sVMWoS0OhsI", e: 16, c: "Functional Bodybuilding", date: "5y ago" },
  ],
  farmer: [
    { t: "How to do a Farmer's Carry by Wodstar", u: "https://www.youtube.com/watch?v=MH8id-EaoPA", e: 17, c: "Wodstar", date: "10y ago" },
  ],
  backext: [
    { t: "Back extension strong", u: "https://www.youtube.com/watch?v=9ceFn3bH5ls", e: 32, c: "Rehab My Patient", date: "12y ago" },
  ],
  sidebend: [
    { t: "Dumbbell Side Bend - Core / Abs - Bodybuilding.com", u: "https://www.youtube.com/watch?v=UUQHeBRE_Wo", e: 44, c: "Bodybuilding.com", date: "13y ago" },
    { t: "How to Do a Dumbbell Side Bend | Ab Workout", u: "https://www.youtube.com/watch?v=dL9ZzqtQI5c", c: "Howcast", date: "14y ago" },
  ],
  pallof: [
    { t: "Banded Standing Pallof Press - OPEX Exercise Library", u: "https://www.youtube.com/watch?v=suXbr509tFQ", e: 12, c: "OPEX Fitness", date: "5y ago" },
  ],
  plank: [
    { t: "How to do a plank: proper form", u: "https://www.youtube.com/watch?v=mwlp75MS6Rg", e: 45, c: "National Academy of Sports Medicine (NASM)", date: "5y ago" },
    { t: "Core exercise: plank", u: "https://www.youtube.com/watch?v=pvIjsG5Svck", c: "Children's Hospital Colorado", date: "9y ago" },
  ],
  sideplank: [
    { t: "Side Plank Tutorial - Proper Form and Technique", u: "https://www.youtube.com/watch?v=iNbH7_edNI8", e: 30, c: "Runna", date: "2y ago" },
    { t: "How to do the perfect Side Plank and most common mistakes", u: "https://www.youtube.com/watch?v=rCxF2nG9vQ0", c: "Get Exercise Confident", date: "7y ago" },
  ],
  birddog: [
    { t: "Alternating Bird Dog", u: "https://www.youtube.com/watch?v=QVRtIHp9h-M", e: 25, c: "The Active Life", date: "5y ago" },
  ],
  deadbug: [
    { t: "Deadbug Tutorial - Proper Form and Technique", u: "https://www.youtube.com/watch?v=g5XKMzr5gUs", e: 41, c: "Runna", date: "2y ago" },
  ],
  jefferson: [
    { t: "Jefferson Curl without Weight", u: "https://www.youtube.com/watch?v=C44fjSS7X5k", e: 45, c: "Rehab My Patient", date: "4y ago" },
  ],
  vigorous: [
    { t: "Alternating step-ups for vigorous cardio", u: "https://www.youtube.com/watch?v=Bv8KHVzEsi8", e: 45, c: "Pilates & Fitness TV", date: "11y ago" },
  ],
  couch: [
    { t: "Couch Stretch for Hip Flexors", u: "https://www.youtube.com/watch?v=QiKl5UoiG5c", e: 33, c: "Movement Enhanced", date: "9y ago" },
  ],
  shin: [
    { t: "Quick and Effective Shin Stretch | Kneeling Stretch for Shin Pain Relief", u: "https://www.youtube.com/watch?v=UwZSer2zUNY", e: 45, c: "Elite Healers Sports Massage", date: "2y ago" },
  ],
  hipflexor: [
    { t: "Back Exercises to Strengthen and Stretch (Half-Kneeling Hip Flexor Stretch) | HSS", u: "https://www.youtube.com/watch?v=mzPvzMivukw", e: 24, c: "Hospital for Special Surgery", date: "1y ago" },
    { t: "How To: Half Kneeling Hip Flexor Stretch", u: "https://www.youtube.com/watch?v=Bfb-9dIWEr4", c: "Live Lean TV Daily Exercises", date: "10mo ago" },
  ],
  bigtoe: [
    { t: "Toe sit stretch", u: "https://www.youtube.com/watch?v=XM4_5sD-d8w", e: 45, c: "Breathe n Pose", date: "5y ago" },
  ],
  butterfly: [
    { t: "How to do a Static Butterfly Stretch | Proper Form & Technique | NASM", u: "https://www.youtube.com/watch?v=v4OLkxi5-Q0", e: 18, c: "National Academy of Sports Medicine (NASM)", date: "5y ago" },
    { t: "Butterfly Stretch for Better Hip Mobility - CORE Chiropractic", u: "https://www.youtube.com/watch?v=MdE_Cj6ChLo", c: "CORE Chiropractic", date: "6y ago" },
  ],
  hamstring: [
    { t: "Modified hamstring stretch for beginners", u: "https://www.youtube.com/watch?v=j4B6Kmi7g5k", e: 45, c: "Justin Agustin", date: "4y ago" },
  ],
  catcow: [
    { t: "Cat - Cow Stretch", u: "https://www.youtube.com/watch?v=LIVJZZyZ2qM", e: 15, c: "Dr. Dawn", date: "8y ago" },
    { t: "How to Do a Cat Cow Pose for Energy | Yoga", u: "https://www.youtube.com/watch?v=kqnua4rHVVA", c: "Howcast", date: "14y ago" },
  ],
  cobra: [
    { t: "Cobra Pose - CORE Chiropractic Exercises", u: "https://www.youtube.com/watch?v=CxI6DjNafyw", e: 45, c: "CORE Chiropractic", date: "7y ago" },
  ],
  tree: [
    { t: "Vrikshasana (The tree pose) - Yoga pose for mental concentration", u: "https://www.youtube.com/watch?v=ZIAnRmD7FqY", e: 42, c: "NatyaSutra Yoga", date: "10y ago" },
    { t: "How to Do a Tree Pose (Vrksasana) | Yoga", u: "https://www.youtube.com/watch?v=wdln9qWYloU", c: "Howcast", date: "14y ago" },
  ],
  thread: [
    { t: "How to Do a Thread the Needle Stretch: A Guide from Physical Therapists", u: "https://www.youtube.com/watch?v=SkQhKf74nZk", e: 45, c: "Hinge Health", date: "1y ago" },
    { t: "Thoracic mobility exercise - thread the needle", u: "https://www.youtube.com/watch?v=6roMIB2YV4Y", c: "Revival Performance Physical Therapy", date: "4y ago" },
  ],
  string: [
    { t: "Wall posture reset", u: "https://www.youtube.com/watch?v=cQRXUMfCF5o", e: 45, c: "Create Your Core", date: "6y ago" },
    { t: "Wall posture check", u: "https://www.youtube.com/watch?v=eD70Re3F3oI", e: 45, c: "PhysioMax Wellness", date: "5y ago" },
    { t: "20 second posture test", u: "https://www.youtube.com/watch?v=5UhS6k8yBDg", c: "Whole Body Health Physical Therapy", date: "2021" },
  ],
  chintuck: [
    { t: "Chin Tucks Sitting - Ask Doctor Jo", u: "https://www.youtube.com/watch?v=7rnlAVhAK-8", e: 29, c: "AskDoctorJo", date: "9y ago" },
  ],
  wallslide: [
    { t: "Serratus Wall Slides", u: "https://www.youtube.com/watch?v=WIdjSjzNS2A", e: 36, c: "The Active Life", date: "4y ago" },
  ],
  pullapart: [
    { t: "Band Pull Apart", u: "https://www.youtube.com/watch?v=pct3bP74WSw", e: 23, c: "The Active Life", date: "5y ago" },
  ],
  facepull: [
    { t: "Banded Face Pulls", u: "https://www.youtube.com/watch?v=zt8EqEGoX6o", e: 15, c: "OPEX Fitness", date: "4y ago" },
  ],
  levator: [
    { t: "Levator scapula shrugs", u: "https://www.youtube.com/watch?v=-lf-FcJFpeE", e: 45, c: "Paragon", date: "2y ago" },
    { t: "Levator scapulae shoulder raise", u: "https://www.youtube.com/watch?v=zsxrRUor1IE", c: "Auclair Family Chiropractic", date: "5y ago" },
    { t: "Shoulder shrug exercise", u: "https://www.youtube.com/watch?v=sZQQK2eqNpE", c: "Husky Orthopaedics", date: "5y ago" },
  ],
  doorway: [
    { t: "Doorway Stretch", u: "https://www.youtube.com/watch?v=B9uY01NoqBg", e: 45, c: "Baptist Health", date: "6y ago" },
  ],
};

// Split exercises: the videos belong to the movement tab, not the hidden parent.
export const CLIP_VIDEOS = {
  backwalk: {
    0: [
    { t: "Walking backwards", u: "https://www.youtube.com/watch?v=Kaxp9nvj1QM", e: 45, c: "Blessing Health System", date: "2023" },
    ],
    1: [
    { t: "Reverse Sled Drag", u: "https://www.youtube.com/watch?v=EOa0-MNaw6k", e: 11, c: "OPEX Fitness", date: "5y ago" },
    ],
  },
  dynamic: {
    0: [
    { t: "Pilates: Arm circles", u: "https://www.youtube.com/watch?v=9pEYwmufn48", e: 44, c: "Rehab My Patient", date: "6y ago" },
    ],
    2: [
    { t: "High Knee - XFit Daily", u: "https://www.youtube.com/watch?v=oDdkytliOqE", e: 45, c: "XHIT Daily", date: "14y ago" },
    ],
    3: [
    { t: "How To Do A DUMBBELL LATERAL LUNGE | Exercise Demonstration Video and Guide", u: "https://www.youtube.com/watch?v=R8jArZG2J6Q", e: 38, c: "Live Lean TV Daily Exercises", date: "7y ago" },
    ],
  },
  heeldrop: {
    0: [
    { t: "How to do Standing Heel Drops", u: "https://www.youtube.com/watch?v=p2nmSgg8P5w", e: 18, c: "Get Strong with Emily", date: "3y ago" },
    ],
    1: [
    { t: "CARDIO: Stomping", u: "https://www.youtube.com/watch?v=_vQaATh3RRc", e: 39, c: "Build a Fit Physique", date: "6y ago" },
    ],
  },
  jumps: {
    2: [
    { t: "Countermovement Jump and Reactive Countermovement Jump", u: "https://www.youtube.com/watch?v=VPJN7rwiNjk", e: 21, c: "Matt with The Movement System", date: "1y ago" },
    ],
  },
  chinup: {
    1: [
    { t: "Five tips for the perfect chin-up", u: "https://www.youtube.com/watch?v=Ln3gAdHr8MM", e: 45, c: "Paul Hadfield", date: "2y ago" },
    ],
  },
  slrdl: {
    0: [
    { t: "How To Do An ALTERNATING SINGLE LEG TOE TOUCH | Exercise Demonstration Video and Guide", u: "https://www.youtube.com/watch?v=yWS6JPMEQpc", e: 39, c: "Live Lean TV Daily Exercises", date: "6y ago" },
    ],
  },
  shortint: {
    0: [
    { t: "high knee exercise and warm-up", u: "https://www.youtube.com/watch?v=ymdS7tM0zws", e: 30, c: "Josh Wilson (Chief)", date: "11y ago" },
    ],
    1: [
    { t: "Marching in Place", u: "https://www.youtube.com/watch?v=-kyhPD2v04w", e: 15, c: "Core Personal Fitness", date: "5y ago" },
    ],
  },
  norwegian: {
    0: [
    { t: "Step Up Exercise | Osteoarthritis Physiotherapy", u: "https://www.youtube.com/watch?v=wfhXnLILqdk", e: 14, c: "Cornerstone Physiotherapy", date: "5y ago" },
    ],
    1: [
    { t: "High Knee - XFit Daily", u: "https://www.youtube.com/watch?v=oDdkytliOqE", e: 45, c: "XHIT Daily", date: "14y ago" },
    ],
    2: [
    { t: "Jumping Jacks - XFit Daily", u: "https://www.youtube.com/watch?v=iSSAk4XCsRA", e: 45, c: "XHIT Daily", date: "14y ago" },
    ],
    3: [
    { t: "Mountain Climber Tutorial - Proper Form and Technique", u: "https://www.youtube.com/watch?v=CQk4MHY2_Tc", e: 29, c: "Runna", date: "2y ago" },
    ],
  },
  indoorhiit: {
    0: [
    { t: "Step Up Exercise | Osteoarthritis Physiotherapy", u: "https://www.youtube.com/watch?v=wfhXnLILqdk", e: 14, c: "Cornerstone Physiotherapy", date: "5y ago" },
    ],
    1: [
    { t: "High Knee - XFit Daily", u: "https://www.youtube.com/watch?v=oDdkytliOqE", e: 45, c: "XHIT Daily", date: "14y ago" },
    ],
    2: [
    { t: "Mountain Climber Tutorial - Proper Form and Technique", u: "https://www.youtube.com/watch?v=CQk4MHY2_Tc", e: 29, c: "Runna", date: "2y ago" },
    ],
  },
  extrot: {
    0: [
    { t: "Shoulder External Rotation with Resistive Band - Ask Doctor Jo", u: "https://www.youtube.com/watch?v=_UvmPNGtlPM", e: 38, c: "AskDoctorJo", date: "9y ago" },
    ],
    1: [
    { t: "ShowandGoTraining.com: Side Lying External Rotation - arm abducted 30 degrees", u: "https://www.youtube.com/watch?v=oNCuZh2Os_U", e: 9, c: "Eric Cressey", date: "15y ago" },
    ],
  },
  neck: {
    0: [
    { t: "Manually resisted cervical flexion isometric", u: "https://www.youtube.com/watch?v=dAl0amB6pjI", e: 45, c: "E3 Rehab Exercise Library", date: "6y ago" },
    ],
    1: [
    { t: "Isometric Cervical Flexion for Neck Strengthening - Ask Doctor Jo", u: "https://www.youtube.com/watch?v=4rK-m6GvNCk", e: 25, c: "AskDoctorJo", date: "9y ago" },
    { t: "Deep Neck Flexion", u: "https://www.youtube.com/watch?v=lRKWP2LzCmw", c: "Baptist Health", date: "6y ago" },
    ],
  },
};

// Groups that already had three videos: trim the first one to a short clip.
export const SHORT_TRIM = {
  "dynamic:1": { index: 0, seconds: 30 },
  "dynamic:4": { index: 0, seconds: 30 },
  "dynamic:5": { index: 0, seconds: 30 },
  "jumps:0": { index: 0, seconds: 30 },
  "jumps:1": { index: 0, seconds: 30 },
  "calf:0": { index: 0, seconds: 30 },
  "calf:1": { index: 0, seconds: 30 },
  "stepup:0": { index: 0, seconds: 30 },
  "stepup:1": { index: 0, seconds: 30 },
  "chinup:0": { index: 0, seconds: 30 },
  "deadhang:0": { index: 0, seconds: 30 },
  "deadhang:1": { index: 0, seconds: 30 },
  "legraise:0": { index: 0, seconds: 30 },
  "legraise:1": { index: 0, seconds: 30 },
  "slrdl:1": { index: 0, seconds: 30 },
  "shouldertap": { index: 0, seconds: 30 },
  "indoorhiit:3": { index: 0, seconds: 30 },
  "indoorhiit:4": { index: 0, seconds: 30 },
  "zone2": { index: 0, seconds: 30 },
};
