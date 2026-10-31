/**
 * Single source of truth for the live seed data.
 *
 * The demo seed (src/lib/seed.ts), the SQL seed (database/seed/0003_seed_live_data.sql)
 * and scripts/seed-supabase.mjs all derive from this module so every institution and
 * listing stays in sync.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(path.resolve(here, '../../database/seed/catalog.json'), 'utf8'),
);

/** Institutions that already existed in the original demo seed. */
export const BASE_INSTITUTIONS = [
  {
    slug: 'gnit',
    name: 'Guru Nanak Institute of Technology',
    type: 'Engineering College',
    location: 'Ibrahimpatnam, Hyderabad',
    contactEmail: 'facilities@gnit.demo',
    verified: true,
  },
  {
    slug: 'media',
    name: 'GNIT Media Department',
    type: 'Academic Department',
    location: 'Block B, GNIT Campus, Hyderabad',
    contactEmail: 'media@gnit.demo',
    verified: true,
  },
  {
    slug: 'innovation',
    name: 'GNIT Innovation Lab',
    type: 'Innovation Centre',
    location: 'Block D, GNIT Campus, Hyderabad',
    contactEmail: 'innovation@gnit.demo',
    verified: true,
  },
  {
    slug: 'electronics',
    name: 'GNIT Electronics Laboratory',
    type: 'Laboratory',
    location: 'Block C, GNIT Campus, Hyderabad',
    contactEmail: 'electronics@gnit.demo',
    verified: true,
  },
  {
    slug: 'makerspace',
    name: 'Hyderabad Community Makerspace',
    type: 'Community Organisation',
    location: 'Kukatpally, Hyderabad',
    contactEmail: 'hello@makerspace.demo',
    verified: false,
  },
];

/** Listings that belong to the original GNIT institutions. */
export const BASE_RESOURCES = [
  {
    slug: 'gnit-optics-bench',
    institution: 'gnit',
    name: 'Optics Laboratory Bench',
    category: 'Laboratories',
    description:
      'A shared optics bench with laser sources, lenses and mounting hardware for undergraduate experiments.',
    location: 'Block C, Room 204, GNIT Campus',
    hourlyRate: 120,
    dailyRate: 600,
    securityDeposit: 500,
    requiredTraining: ['Lab safety induction'],
  },
  {
    slug: 'gnit-seminar-classroom',
    institution: 'gnit',
    name: 'Seminar Classroom — Academic Block',
    category: 'Classrooms',
    description:
      'A 60-seat smart classroom with projector, smart board, microphones and recording support for workshops and guest sessions.',
    location: 'Academic Block A, Room 105, GNIT Campus',
    hourlyRate: 300,
    dailyRate: 1500,
    securityDeposit: 0,
  },
  {
    slug: 'media-camera-kit',
    institution: 'media',
    name: 'Canon EOS R50 Kit',
    category: 'Cameras and Photography Equipment',
    description:
      'Mirrorless camera kit with two lenses, tripod and SD cards for departmental media projects.',
    location: 'Media Department Store, Block B, GNIT Campus',
    hourlyRate: 90,
    dailyRate: 450,
    securityDeposit: 1000,
    requiredQualifications: ['Photography fundamentals'],
  },
  {
    slug: 'media-podcast-studio',
    institution: 'media',
    name: 'Podcast and Recording Studio',
    category: 'Other Resources',
    description:
      'Sound-treated studio with condenser microphones, audio interface, headphones and mixing software.',
    location: 'Media Studio, Block B, GNIT Campus',
    hourlyRate: 250,
    dailyRate: 1000,
    securityDeposit: 1000,
  },
  {
    slug: 'innovation-prusa',
    institution: 'innovation',
    name: 'Prusa MK4 3D Printer',
    category: '3D Printers',
    description:
      'FDM printer for prototyping with PLA and PETG. Induction required before first use.',
    location: 'Innovation Lab, Block D, GNIT Campus',
    hourlyRate: 60,
    dailyRate: 300,
    securityDeposit: 250,
    requiredTraining: ['3D printing safety orientation'],
  },
  {
    slug: 'innovation-cnc-router',
    institution: 'innovation',
    name: 'CNC Router — Fabrication Bay',
    category: 'Manufacturing Tools',
    description:
      'Desktop CNC router for wood, acrylic and soft metal prototyping with dust extraction and tooling set.',
    location: 'Fabrication Lab, Block D, GNIT Campus',
    hourlyRate: 450,
    dailyRate: 2000,
    securityDeposit: 2500,
    requiredQualifications: ['CNC operator certification'],
    supervisionRequired: true,
  },
  {
    slug: 'electronics-workbench',
    institution: 'electronics',
    name: 'Electronics Workbench',
    category: 'Electronics Equipment',
    description:
      'Soldering station, oscilloscope and bench power supply for student electronics projects.',
    location: 'Block C, Room 110, GNIT Campus',
    hourlyRate: 50,
    dailyRate: 250,
    securityDeposit: 0,
    supervisionRequired: true,
  },
  {
    slug: 'makerspace-robotics-kit',
    institution: 'makerspace',
    name: 'Robotics Development Kit',
    category: 'Research Equipment',
    description:
      'Articulated arm, LiDAR sensor, motor drivers, microcontrollers and a ROS-ready workstation.',
    location: 'Kukatpally, Hyderabad',
    hourlyRate: 350,
    dailyRate: 1600,
    securityDeposit: 2000,
    requiredQualifications: ['Robotics safety certification'],
    supervisionRequired: true,
  },
  {
    slug: 'makerspace-woodworking',
    institution: 'makerspace',
    name: 'Woodworking Workshop',
    category: 'Workshop Equipment',
    description:
      'Table saw, drill press, sanders, hand tools and a dust extraction system for furniture and model making.',
    location: 'Manufacturing Bay, Kukatpally, Hyderabad',
    hourlyRate: 200,
    dailyRate: 900,
    securityDeposit: 1200,
    requiredTraining: ['Power tools safety'],
    supervisionRequired: true,
  },
];

export const INSTITUTIONS = [...BASE_INSTITUTIONS, ...catalog.institutions];
export const RESOURCES = [...BASE_RESOURCES, ...catalog.resources];

/** Accounts created by scripts/seed-supabase.mjs and by the SQL seed. */
export const ACCOUNTS = [
  {
    slug: 'admin',
    email: 'admin@spacexchange.dev',
    password: 'Admin@123',
    fullName: 'Platform Administrator',
    role: 'administrator',
    institution: 'gnit',
  },
  {
    slug: 'manager',
    email: 'manager@spacexchange.dev',
    password: 'Manager@123',
    fullName: 'Meera Rao',
    role: 'institution_manager',
    institution: 'gnit',
  },
  {
    slug: 'owner',
    email: 'owner@spacexchange.dev',
    password: 'Owner@123',
    fullName: 'Arjun Patel',
    role: 'resource_owner',
    institution: 'gnit',
  },
  {
    slug: 'user',
    email: 'user@spacexchange.dev',
    password: 'User@123',
    fullName: 'Aarav Mehta',
    role: 'user',
    institution: 'gnit',
  },
];

/** Deterministic UUID so repeated seeds update rows instead of duplicating them. */
export function seedUuid(kind, slug) {
  const hex = createHash('md5').update(`spacexchange:${kind}:${slug}`, 'utf8').digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const INSTITUTION_BY_SLUG = new Map(INSTITUTIONS.map((row) => [row.slug, row]));

export const DEFAULTS = {
  availableDays: [1, 2, 3, 4, 5, 6],
  openTime: '08:00',
  closeTime: '20:00',
  maxBookingHours: 4,
  usageInstructions:
    'Handle the equipment with care, follow the on-site safety briefing and leave the space tidy.',
  bookingConditions: 'Bookings must be cancelled at least 24 hours in advance.',
  cancellationPolicy: 'Free cancellation up to 24 hours before the booking starts.',
};
