// Embedded dataset for the shapes tool (link-shape comparison, dot-do/data#36).
// 53 canonical Job records from the #34 adapter PoC
// (git show origin/poc/adapter-two-paths:poc/adapter-two-paths/out/batch.ndjson),
// id/company parsed from the Greenhouse sourceUrl. Provenance: ingest/stated/posted.
export interface Job { id: string; title: string; company: string; location: string; department: string | null; postedAt: string; sourceUrl: string }
export const JOBS: Job[] = [
  {
    "id": "4266196009",
    "title": "AI Red Teamer, Cyber",
    "company": "10alabs",
    "location": "Washington DC",
    "department": null,
    "postedAt": "2026-06-01T16:00:58.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4266196009"
  },
  {
    "id": "4336077009",
    "title": "Compliance Manager",
    "company": "10alabs",
    "location": "Remote",
    "department": null,
    "postedAt": "2026-07-28T18:28:15.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4336077009"
  },
  {
    "id": "4330885009",
    "title": "Cybersecurity Engineer",
    "company": "10alabs",
    "location": "Remote",
    "department": null,
    "postedAt": "2026-07-28T21:38:23.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4330885009"
  },
  {
    "id": "4203095009",
    "title": "Engineering Fellowship",
    "company": "10alabs",
    "location": "Washington D.C. ",
    "department": null,
    "postedAt": "2026-03-27T18:16:06.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4203095009"
  },
  {
    "id": "4336263009",
    "title": "Finance Manager - Accounting & FP&A",
    "company": "10alabs",
    "location": "Remote",
    "department": null,
    "postedAt": "2026-07-28T20:47:48.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4336263009"
  },
  {
    "id": "4003000009",
    "title": "General Candidate Application ",
    "company": "10alabs",
    "location": "New York City ",
    "department": null,
    "postedAt": "2025-06-03T00:49:28.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4003000009"
  },
  {
    "id": "4292584009",
    "title": "Junior Cyber Investigator",
    "company": "10alabs",
    "location": "Washington DC",
    "department": null,
    "postedAt": "2026-06-22T22:00:27.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4292584009"
  },
  {
    "id": "4273194009",
    "title": "Machine Learning Engineer ",
    "company": "10alabs",
    "location": "Washington D.C. ",
    "department": null,
    "postedAt": "2026-06-03T22:36:00.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4273194009"
  },
  {
    "id": "4297133009",
    "title": "Principal Cyber Investigator",
    "company": "10alabs",
    "location": "Washington DC",
    "department": null,
    "postedAt": "2026-06-24T22:34:27.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4297133009"
  },
  {
    "id": "4088517009",
    "title": "Protection Scientist Engineer",
    "company": "10alabs",
    "location": "London, UK",
    "department": null,
    "postedAt": "2025-12-23T16:03:00.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4088517009"
  },
  {
    "id": "4273684009",
    "title": "Red Teaming Fellowship",
    "company": "10alabs",
    "location": "Washington D.C. ",
    "department": null,
    "postedAt": "2026-06-04T16:42:53.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4273684009"
  },
  {
    "id": "4007350009",
    "title": "Research Fellow",
    "company": "10alabs",
    "location": "Washington D.C.",
    "department": null,
    "postedAt": "2025-07-07T19:22:19.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4007350009"
  },
  {
    "id": "4292581009",
    "title": "Senior Cyber Investigator",
    "company": "10alabs",
    "location": "Washington DC",
    "department": null,
    "postedAt": "2026-06-22T21:55:35.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4292581009"
  },
  {
    "id": "4331389009",
    "title": "Software Engineer, Infrastructure & Platform",
    "company": "10alabs",
    "location": "Remote",
    "department": null,
    "postedAt": "2026-08-17T22:38:05.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4331389009"
  },
  {
    "id": "4120642009",
    "title": "Threat Investigator - APAC",
    "company": "10alabs",
    "location": "Sydney, Australia",
    "department": null,
    "postedAt": "2026-02-09T17:54:32.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4120642009"
  },
  {
    "id": "4112665009",
    "title": "Threat Investigator - EMEA",
    "company": "10alabs",
    "location": "London, UK",
    "department": null,
    "postedAt": "2026-01-27T18:11:47.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4112665009"
  },
  {
    "id": "4002458009",
    "title": "Threat Investigator US ",
    "company": "10alabs",
    "location": "Remote - Pacific Time ",
    "department": null,
    "postedAt": "2025-05-22T15:01:54.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/10alabs/jobs/4002458009"
  },
  {
    "id": "8136607",
    "title": "Benefits Specialist",
    "company": "1800contacts",
    "location": "Draper, UT (Hybrid)",
    "department": null,
    "postedAt": "2026-08-20T17:06:29.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/1800contacts/jobs/8136607"
  },
  {
    "id": "8097027",
    "title": "Digital Analytics & Engineering Manager",
    "company": "1800contacts",
    "location": "Draper, UT (Hybrid)",
    "department": null,
    "postedAt": "2026-07-30T20:44:35.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/1800contacts/jobs/8097027"
  },
  {
    "id": "6330097",
    "title": "Distribution Center Associate (Customer Care)",
    "company": "1800contacts",
    "location": "Salt Lake City, UT",
    "department": null,
    "postedAt": "2024-10-30T20:56:17.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/1800contacts/jobs/6330097"
  },
  {
    "id": "7481286",
    "title": "Distribution Center Associate (Shipping)",
    "company": "1800contacts",
    "location": "Coppell, TX",
    "department": null,
    "postedAt": "2026-05-08T23:25:40.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/1800contacts/jobs/7481286"
  },
  {
    "id": "7481340",
    "title": "Distribution Center Associate (Shipping)",
    "company": "1800contacts",
    "location": "Salt Lake City, UT",
    "department": null,
    "postedAt": "2026-05-28T14:36:22.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/1800contacts/jobs/7481340"
  },
  {
    "id": "6271338",
    "title": "General Call Center Positions",
    "company": "1800contacts",
    "location": "Draper, UT (Remote)",
    "department": null,
    "postedAt": "2024-09-24T20:27:59.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/1800contacts/jobs/6271338"
  },
  {
    "id": "6437930",
    "title": "Optical Manufacturing Technician",
    "company": "1800contacts",
    "location": "Salt Lake City, UT",
    "department": null,
    "postedAt": "2024-11-27T18:10:57.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/1800contacts/jobs/6437930"
  },
  {
    "id": "8146009",
    "title": "Optical Styling & Customer Experience Consultant",
    "company": "1800contacts",
    "location": "Draper, UT (Hybrid)",
    "department": null,
    "postedAt": "2026-08-21T02:24:03.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/1800contacts/jobs/8146009"
  },
  {
    "id": "8109007",
    "title": "Paid Social Manager",
    "company": "1800contacts",
    "location": "Draper, UT (Hybrid)",
    "department": null,
    "postedAt": "2026-08-05T15:53:04.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/1800contacts/jobs/8109007"
  },
  {
    "id": "8120364",
    "title": "Software Engineer II",
    "company": "1800contacts",
    "location": "Draper, UT (Hybrid)",
    "department": null,
    "postedAt": "2026-08-10T20:16:51.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/1800contacts/jobs/8120364"
  },
  {
    "id": "8142670",
    "title": "Workforce Planning & Scheduling Specialist",
    "company": "1800contacts",
    "location": "Draper, UT (Hybrid)",
    "department": null,
    "postedAt": "2026-08-20T17:27:46.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/1800contacts/jobs/8142670"
  },
  {
    "id": "8142682",
    "title": "Workforce Real-Time Coordinator",
    "company": "1800contacts",
    "location": "Draper, UT (Hybrid)",
    "department": null,
    "postedAt": "2026-08-20T17:32:04.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/1800contacts/jobs/8142682"
  },
  {
    "id": "6015958004",
    "title": "App Development Architect(.Net)",
    "company": "66degrees",
    "location": "Bengaluru, Pune",
    "department": null,
    "postedAt": "2026-06-08T07:06:41.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6015958004"
  },
  {
    "id": "5736177004",
    "title": "Application Development Architect (Java)",
    "company": "66degrees",
    "location": "Remote, United States",
    "department": null,
    "postedAt": "2026-08-12T21:04:21.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/5736177004"
  },
  {
    "id": "6011634004",
    "title": "Client Outcome Architect",
    "company": "66degrees",
    "location": "Remote, United States",
    "department": null,
    "postedAt": "2026-06-02T19:03:44.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6011634004"
  },
  {
    "id": "6146088004",
    "title": "Cloud Architect",
    "company": "66degrees",
    "location": "India",
    "department": null,
    "postedAt": "2026-08-18T12:58:26.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6146088004"
  },
  {
    "id": "6113501004",
    "title": "Cloud Engineer",
    "company": "66degrees",
    "location": "India",
    "department": null,
    "postedAt": "2026-07-10T08:03:45.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6113501004"
  },
  {
    "id": "6141079004",
    "title": "Cloud Engineer, Contract",
    "company": "66degrees",
    "location": "Remote, United States",
    "department": null,
    "postedAt": "2026-08-11T15:24:17.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6141079004"
  },
  {
    "id": "5973284004",
    "title": "Enterprise Account Executive, Atlanta",
    "company": "66degrees",
    "location": "Atlanta, GA",
    "department": null,
    "postedAt": "2026-06-18T17:29:11.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/5973284004"
  },
  {
    "id": "5746837004",
    "title": "Enterprise Account Executive, West",
    "company": "66degrees",
    "location": "San Francisco, US",
    "department": null,
    "postedAt": "2026-01-09T16:52:24.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/5746837004"
  },
  {
    "id": "6015084004",
    "title": "Forward Deployed Engineer",
    "company": "66degrees",
    "location": "Bengaluru, Pune",
    "department": null,
    "postedAt": "2026-06-05T12:04:43.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6015084004"
  },
  {
    "id": "5805595004",
    "title": "GCP Data Engineer",
    "company": "66degrees",
    "location": "Bengaluru, Pune",
    "department": null,
    "postedAt": "2026-02-17T06:12:13.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/5805595004"
  },
  {
    "id": "6128485004",
    "title": "Google Site Community Manager",
    "company": "66degrees",
    "location": "India",
    "department": null,
    "postedAt": "2026-07-28T06:21:13.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6128485004"
  },
  {
    "id": "6127315004",
    "title": "IT Service Desk Intern",
    "company": "66degrees",
    "location": "Bangalore",
    "department": null,
    "postedAt": "2026-07-27T06:27:48.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6127315004"
  },
  {
    "id": "6139546004",
    "title": "Lead SRE",
    "company": "66degrees",
    "location": "Bengaluru, Pune",
    "department": null,
    "postedAt": "2026-08-10T10:16:40.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6139546004"
  },
  {
    "id": "6130886004",
    "title": "M365 Architect, Contract",
    "company": "66degrees",
    "location": "Remote, United States",
    "department": null,
    "postedAt": "2026-08-05T11:24:36.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6130886004"
  },
  {
    "id": "5962162004",
    "title": "Microstrategy Administrator",
    "company": "66degrees",
    "location": "Bengaluru, Pune",
    "department": null,
    "postedAt": "2026-04-13T06:07:22.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/5962162004"
  },
  {
    "id": "6150358004",
    "title": "Player-Coach Sales Leader ",
    "company": "66degrees",
    "location": "Bangalore",
    "department": null,
    "postedAt": "2026-08-22T02:37:31.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6150358004"
  },
  {
    "id": "6100304004",
    "title": "Resource Management Assistant",
    "company": "66degrees",
    "location": "Bengaluru, Pune",
    "department": null,
    "postedAt": "2026-06-24T05:47:57.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6100304004"
  },
  {
    "id": "6105984004",
    "title": "Security Operations AI Engineer, Contract",
    "company": "66degrees",
    "location": "Remote, United States",
    "department": null,
    "postedAt": "2026-07-02T11:09:10.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6105984004"
  },
  {
    "id": "5826403004",
    "title": "Security Operations Manager",
    "company": "66degrees",
    "location": "Bengaluru, Pune",
    "department": null,
    "postedAt": "2026-03-13T06:09:42.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/5826403004"
  },
  {
    "id": "6093525004",
    "title": "Senior Delivery Manager",
    "company": "66degrees",
    "location": "Bengaluru, Pune",
    "department": null,
    "postedAt": "2026-06-18T13:13:48.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6093525004"
  },
  {
    "id": "5999655004",
    "title": "Software Engineer ",
    "company": "66degrees",
    "location": "Bengaluru, Pune",
    "department": null,
    "postedAt": "2026-05-19T08:37:15.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/5999655004"
  },
  {
    "id": "6018453004",
    "title": "Solution Consultant(Managed Services)",
    "company": "66degrees",
    "location": "Bengaluru, Pune",
    "department": null,
    "postedAt": "2026-06-10T13:59:58.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6018453004"
  },
  {
    "id": "6008169004",
    "title": "Talent Development Specialist",
    "company": "66degrees",
    "location": "Chicago, IL",
    "department": null,
    "postedAt": "2026-06-17T18:49:30.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/6008169004"
  },
  {
    "id": "5746817004",
    "title": "Workspace Architect",
    "company": "66degrees",
    "location": "Remote, United States",
    "department": null,
    "postedAt": "2026-04-02T15:45:38.000Z",
    "sourceUrl": "https://job-boards.greenhouse.io/66degrees/jobs/5746817004"
  }
]
