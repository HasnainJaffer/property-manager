// Shared mock data for PropFlow prototypes
window.PROPFLOW_DATA = {
  org: { name: "Test LTD", plan: "Buy to Let", member: "Alex Mehnain" },

  kpis: {
    rentRoll: { value: 4850, label: "Monthly rent roll", sub: "4 active tenancies",
      spark: [4200, 4200, 4400, 4400, 4650, 4650, 4850, 4850, 4850, 4850, 4850, 4850] },
    arrears:  { value: 3200, label: "Arrears", sub: "1 tenant overdue",
      spark: [800, 800, 1600, 1600, 1600, 3200, 3200, 3200, 3200, 3200, 3200, 3200] },
    occupancy:{ value: 80,   label: "Occupancy", sub: "4 of 5 units let",
      spark: [100, 100, 100, 80, 80, 80, 80, 80, 80, 80, 80, 80] },
    expiring: { value: 2,    label: "Expiring soon", sub: "Within 60 days",
      spark: [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 2] },
  },

  properties: [
    { id: "p1", name: "24 Thornton Road", type: "House · 3 bed",      city: "London SW2",
      units: 2, occupied: 2, monthly: 1850, status: "Healthy",   compliance: "warn",
      tenants: ["Sarah Mitchell", "Sarah Mitchell"], image: "linear-gradient(135deg,#5b6b8a,#1f2937)" },
    { id: "p2", name: "14b Coldharbour Lane", type: "Flat · 2 bed",    city: "London SW9",
      units: 2, occupied: 2, monthly: 2000, status: "Arrears",   compliance: "ok",
      tenants: ["Daniel Okafor", "Emma Thompson"], image: "linear-gradient(135deg,#7c6f5a,#1f1b15)" },
    { id: "p3", name: "7 Beech Grove",       type: "Flat · 1 bed",     city: "London E8",
      units: 1, occupied: 1, monthly: 1000, status: "Healthy",   compliance: "warn",
      tenants: ["Marcus Lee"],                  image: "linear-gradient(135deg,#5a7c6f,#11231d)" },
    { id: "p4", name: "Flat 3, 92 Maple Way", type: "Flat · Studio",   city: "London N7",
      units: 1, occupied: 0, monthly: 0,    status: "Void",      compliance: "ok",
      tenants: [],                              image: "linear-gradient(135deg,#8a6a8a,#1f152a)" },
  ],

  rent: {
    month: "May 2026",
    totalDue: 4850, collected: 3250, outstanding: 1600,
    overdue: [
      { tenant: "Daniel Okafor", property: "Flat 2, 14b Coldharbour Lane", due: "01/04/2026", amount: 1600, ageDays: 44 },
      { tenant: "Daniel Okafor", property: "Flat 2, 14b Coldharbour Lane", due: "01/05/2026", amount: 1600, ageDays: 14 },
    ],
    history: [3100, 3400, 3800, 4100, 4200, 4400, 4500, 4500, 4650, 4850, 4850, 3250],
  },

  compliance: [
    { cert: "Gas Safety Certificate", property: "24 Thornton Road",        expiry: "10/05/2026", status: "expired", daysLeft: -14 },
    { cert: "Gas Safety Certificate", property: "7 Beech Grove",           expiry: "10/07/2026", status: "soon",    daysLeft: 56 },
    { cert: "EICR",                   property: "14b Coldharbour Lane",    expiry: "22/11/2026", status: "ok",      daysLeft: 181 },
    { cert: "EPC",                    property: "24 Thornton Road",        expiry: "04/02/2028", status: "ok",      daysLeft: 620 },
    { cert: "PAT Test",               property: "Flat 3, 92 Maple Way",    expiry: "18/08/2026", status: "soon",    daysLeft: 86 },
    { cert: "Landlord License",       property: "14b Coldharbour Lane",    expiry: "30/12/2027", status: "ok",      daysLeft: 580 },
  ],

  renewals: [
    { tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Road",     end: "30/06/2026", days: 46, kind: "Fixed" },
    { tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane", end: "31/07/2025", days: -298, kind: "Periodic" },
    { tenant: "Marcus Lee",     unit: "7 Beech Grove",                end: "14/09/2026", days: 113, kind: "Fixed" },
  ],

  tenancies: [
    { tenant: "Sarah Mitchell",  unit: "Flat A, 24 Thornton Road",     rent: 1100, balance: 0,     start: "01/07/2025", end: "30/06/2026", status: "Active" },
    { tenant: "Sarah Mitchell",  unit: "Flat B, 24 Thornton Road",     rent: 750,  balance: 0,     start: "01/07/2025", end: "30/06/2026", status: "Active" },
    { tenant: "Daniel Okafor",   unit: "Flat 2, 14b Coldharbour Lane", rent: 1600, balance: -3200, start: "15/03/2025", end: "14/03/2026", status: "Arrears" },
    { tenant: "Emma Thompson",   unit: "Flat 1, 14b Coldharbour Lane", rent: 400,  balance: 0,     start: "01/08/2024", end: "31/07/2025", status: "Periodic" },
    { tenant: "Marcus Lee",      unit: "7 Beech Grove",                rent: 1000, balance: 0,     start: "15/09/2025", end: "14/09/2026", status: "Active" },
  ],

  maintenance: [
    { id: "m1", title: "Leaking kitchen tap",       property: "Flat 2, 14b Coldharbour Lane", priority: "Medium", status: "In progress", reported: "12/05/2026", assignee: "MJ Plumbing" },
    { id: "m2", title: "Boiler annual service",     property: "24 Thornton Road",             priority: "Low",    status: "Scheduled",   reported: "08/05/2026", assignee: "TG Heating" },
    { id: "m3", title: "Broken bedroom window",     property: "7 Beech Grove",                priority: "High",   status: "Open",        reported: "21/05/2026", assignee: "Unassigned" },
    { id: "m4", title: "Repaint hallway",           property: "Flat 3, 92 Maple Way",         priority: "Low",    status: "Open",        reported: "20/05/2026", assignee: "Unassigned" },
  ],

  team: [
    { name: "Alex Mehnain",   role: "Owner",          email: "alex@testltd.co.uk" },
    { name: "Priya Shah",     role: "Property Manager", email: "priya@testltd.co.uk" },
    { name: "Tom Reilly",     role: "Bookkeeper",     role2: "Part-time", email: "tom@testltd.co.uk" },
  ],

  nav: [
    { section: "OVERVIEW",     items: [ { id: "dashboard",  label: "Dashboard",  icon: "grid" } ] },
    { section: "PORTFOLIO",    items: [
      { id: "properties", label: "Properties", icon: "home" },
      { id: "tenancies",  label: "Tenancies",  icon: "doc" },
      { id: "tenants",    label: "Tenants",    icon: "people" },
    ] },
    { section: "FINANCE",      items: [ { id: "ledger",     label: "Rent Ledger", icon: "pound" } ] },
    { section: "OPERATIONS",   items: [
      { id: "compliance", label: "Compliance",  icon: "shield" },
      { id: "maintenance",label: "Maintenance", icon: "wrench" },
    ] },
    { section: "ORGANISATION", items: [
      { id: "team",       label: "Team",       icon: "team" },
      { id: "settings",   label: "Settings",   icon: "gear" },
    ] },
  ],
};
