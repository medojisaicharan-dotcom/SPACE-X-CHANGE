import { addDays, format, subHours } from 'date-fns';
import { CATEGORY_IMAGES } from '@/types';
import { minutesToTime } from '@/utils/date';
import catalogJson from '../../database/seed/catalog.json';
import type {
  AuditLog,
  Booking,
  CheckinRecord,
  CheckoutRecord,
  ConditionReport,
  Database,
  Incident,
  Institution,
  Notification,
  Profile,
  Resource,
  UserQualification,
  WaitingListEntry,
} from '@/types';

const date = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd');
const timestamp = (offsetDays = 0, offsetHours = 0) =>
  subHours(addDays(new Date(), offsetDays), offsetHours).toISOString();

export const DEMO_SHOWCASE_OWNER_ID = 'usr_owner';
export const DEMO_SHOWCASE_USER_ID = 'usr_user';

interface CatalogInstitution {
  slug: string;
  name: string;
  type: string;
  location: string;
  contactEmail: string;
  verified: boolean;
}

interface CatalogResource {
  slug: string;
  institution: string;
  name: string;
  category: string;
  description: string;
  location: string;
  hourlyRate: number;
  dailyRate: number;
  securityDeposit: number;
  maxBookingHours?: number;
  openTime?: string;
  closeTime?: string;
  requiredQualifications?: string[];
  requiredTraining?: string[];
  supervisionRequired?: boolean;
  usageInstructions?: string;
  bookingConditions?: string;
}

const catalog = catalogJson as { institutions: CatalogInstitution[]; resources: CatalogResource[] };

export const catalogInstitutionId = (slug: string) => `inst_${slug}`;

const catalogInstitutions: Institution[] = catalog.institutions.map((institution) => ({
  id: catalogInstitutionId(institution.slug),
  name: institution.name,
  type: institution.type,
  location: institution.location,
  contactEmail: institution.contactEmail,
  verified: institution.verified,
  createdAt: timestamp(-100),
}));

const institutions: Institution[] = [
  {
    id: 'inst_gnit',
    name: 'Guru Nanak Institute of Technology',
    type: 'Engineering College',
    location: 'Ibrahimpatnam, Hyderabad',
    contactEmail: 'facilities@gnit.demo',
    verified: true,
    createdAt: timestamp(-180),
  },
  {
    id: 'inst_media',
    name: 'GNIT Media Department',
    type: 'Academic Department',
    location: 'Block B, GNIT Campus, Hyderabad',
    contactEmail: 'media@gnit.demo',
    verified: true,
    createdAt: timestamp(-170),
  },
  {
    id: 'inst_innovation',
    name: 'GNIT Innovation Lab',
    type: 'Innovation Centre',
    location: 'Block D, GNIT Campus, Hyderabad',
    contactEmail: 'innovation@gnit.demo',
    verified: true,
    createdAt: timestamp(-160),
  },
  {
    id: 'inst_electronics',
    name: 'GNIT Electronics Laboratory',
    type: 'Laboratory',
    location: 'Block C, GNIT Campus, Hyderabad',
    contactEmail: 'electronics@gnit.demo',
    verified: true,
    createdAt: timestamp(-150),
  },
  {
    id: 'inst_makerspace',
    name: 'Hyderabad Community Makerspace',
    type: 'Community Organisation',
    location: 'Kukatpally, Hyderabad',
    contactEmail: 'hello@makerspace.demo',
    verified: false,
    createdAt: timestamp(-90),
  },
  ...catalogInstitutions,
];

function buildProfiles(hashes: Record<string, string>): Profile[] {
  const base = {
    institutionId: 'inst_gnit',
    institutionName: 'Guru Nanak Institute of Technology',
    verified: true,
    suspended: false,
    createdAt: timestamp(-120),
    updatedAt: timestamp(-10),
  };
  return [
    {
      ...base,
      id: 'usr_admin',
      email: 'admin@spacexchange.demo',
      fullName: 'Ananya Rao',
      role: 'administrator',
      passwordHash: hashes.admin,
    },
    {
      ...base,
      id: 'usr_manager',
      email: 'manager@spacexchange.demo',
      fullName: 'Meera Krishnan',
      role: 'institution_manager',
      passwordHash: hashes.manager,
    },
    {
      ...base,
      id: DEMO_SHOWCASE_OWNER_ID,
      email: 'owner@spacexchange.demo',
      fullName: 'Rahul Verma',
      role: 'resource_owner',
      passwordHash: hashes.owner,
    },
    {
      ...base,
      id: DEMO_SHOWCASE_USER_ID,
      email: 'user@spacexchange.demo',
      fullName: 'Harshith Nagubandi',
      role: 'user',
      passwordHash: hashes.user,
    },
    {
      ...base,
      id: 'usr_priya',
      email: 'priya@spacexchange.demo',
      fullName: 'Priya Sharma',
      role: 'user',
      institutionId: 'inst_media',
      institutionName: 'GNIT Media Department',
      passwordHash: hashes.user,
    },
    {
      ...base,
      id: 'usr_arjun',
      email: 'arjun@spacexchange.demo',
      fullName: 'Arjun Patel',
      role: 'user',
      institutionId: 'inst_innovation',
      institutionName: 'GNIT Innovation Lab',
      passwordHash: hashes.user,
    },
    {
      ...base,
      id: 'usr_kavya',
      email: 'kavya@spacexchange.demo',
      fullName: 'Kavya Reddy',
      role: 'resource_owner',
      institutionId: 'inst_makerspace',
      institutionName: 'Hyderabad Community Makerspace',
      verified: false,
      passwordHash: hashes.owner,
    },
  ];
}

function buildResource(partial: Partial<Resource> & Pick<Resource, 'id' | 'name' | 'category' | 'description' | 'image'>): Resource {
  return {
    ownerId: DEMO_SHOWCASE_OWNER_ID,
    institutionId: 'inst_gnit',
    institutionName: 'Guru Nanak Institute of Technology',
    location: 'GNIT Campus, Hyderabad',
    availableFrom: date(-30),
    availableTo: date(150),
    availableDays: [1, 2, 3, 4, 5, 6],
    openTime: '08:00',
    closeTime: '20:00',
    blackoutDates: [],
    hourlyRate: 200,
    dailyRate: 800,
    securityDeposit: 0,
    requiredQualifications: [],
    requiredTraining: [],
    supervisionRequired: false,
    eligibilityNotes: '',
    usageInstructions: 'Handle the equipment with care and leave the space tidy after use.',
    bookingConditions: 'Bookings must be cancelled at least 24 hours in advance.',
    maxBookingHours: 6,
    cancellationPolicy: 'Free cancellation up to 24 hours before the booking starts.',
    active: true,
    createdAt: timestamp(-60),
    updatedAt: timestamp(-5),
    ...partial,
  };
}

function buildResources(): Resource[] {
  const handcrafted: Resource[] = [
    buildResource({
      id: 'res_lab',
      name: 'Computer Laboratory — GNIT',
      category: 'Computers and Laptops',
      description:
        'A 40-seat computer laboratory with high-performance workstations, gigabit networking and a teaching projector. Suitable for programming workshops, software training, coding bootcamps and examinations.',
      image: '/images/computers.svg',
      institutionId: 'inst_gnit',
      institutionName: 'Guru Nanak Institute of Technology',
      location: 'Block C, Room 204, GNIT Campus, Hyderabad',
      hourlyRate: 250,
      dailyRate: 1200,
      securityDeposit: 1000,
      requiredTraining: ['Lab safety induction'],
      maxBookingHours: 6,
      usageInstructions:
        'Log in with the guest account, do not install unlicensed software and shut down all machines before leaving.',
      bookingConditions: 'Maximum 40 participants. A faculty coordinator must be present for external groups.',
      supervisionRequired: false,
      createdAt: timestamp(-58),
    }),
    buildResource({
      id: 'res_camera',
      name: 'DSLR Camera Kit — Media Department',
      category: 'Cameras and Photography Equipment',
      description:
        'Canon DSLR body with 18–135mm lens, tripod, two batteries, charger and a padded carry case. Ideal for event coverage, documentary projects and student media assignments.',
      image: '/images/camera.svg',
      institutionId: 'inst_media',
      institutionName: 'GNIT Media Department',
      location: 'Block B, Media Studio, GNIT Campus, Hyderabad',
      hourlyRate: 150,
      dailyRate: 600,
      securityDeposit: 3000,
      requiredQualifications: ['Photography fundamentals'],
      requiredTraining: ['Equipment handling briefing'],
      maxBookingHours: 8,
      usageInstructions: 'Format the card before returning. Do not remove the lens in dusty environments.',
      bookingConditions: 'The security deposit is refundable after a satisfactory condition check.',
      createdAt: timestamp(-55),
    }),
    buildResource({
      id: 'res_printer',
      name: '3D Printer — Innovation Lab',
      category: '3D Printers',
      description:
        'FDM 3D printer with a 220×220×250mm build volume, PLA filament and slicing workstation. Perfect for prototypes, design coursework and rapid fabrication experiments.',
      image: '/images/printer.svg',
      institutionId: 'inst_innovation',
      institutionName: 'GNIT Innovation Lab',
      location: 'Block D, Innovation Lab, GNIT Campus, Hyderabad',
      hourlyRate: 300,
      dailyRate: 1500,
      securityDeposit: 1500,
      requiredTraining: ['3D printing safety orientation'],
      supervisionRequired: true,
      maxBookingHours: 6,
      usageInstructions: 'Bring your own filament or purchase from the lab. Always remain with the printer while it runs.',
      bookingConditions: 'A lab technician supervises the first print of every new user.',
      createdAt: timestamp(-52),
    }),
    buildResource({
      id: 'res_electronics',
      name: 'Electronics Testing Kit — Electronics Laboratory',
      category: 'Electronics Equipment',
      description:
        'Bench power supply, digital oscilloscope, function generator, multimeter and component kit for embedded and circuit testing projects.',
      image: '/images/electronics.svg',
      institutionId: 'inst_electronics',
      institutionName: 'GNIT Electronics Laboratory',
      location: 'Block C, Electronics Lab, GNIT Campus, Hyderabad',
      hourlyRate: 120,
      dailyRate: 500,
      securityDeposit: 800,
      requiredTraining: ['Electrical safety briefing'],
      supervisionRequired: true,
      maxBookingHours: 4,
      usageInstructions: 'Verify probe ratings before measurement and power down the bench after use.',
      bookingConditions: 'Supervised access only. Report any damaged probe or blown fuse immediately.',
      createdAt: timestamp(-48),
    }),
    buildResource({
      id: 'res_conference',
      name: 'Conference Room — Main Campus',
      category: 'Conference Halls',
      description:
        'A 120-seat air-conditioned conference hall with stage lighting, PA system, projector, podium and green room. Suitable for seminars, guest lectures and competitions.',
      image: '/images/conference.svg',
      institutionId: 'inst_gnit',
      institutionName: 'Guru Nanak Institute of Technology',
      location: 'Main Building, Ground Floor, GNIT Campus, Hyderabad',
      hourlyRate: 500,
      dailyRate: 3000,
      securityDeposit: 0,
      maxBookingHours: 8,
      usageInstructions: 'Coordinate with the AV team 30 minutes before the event for a sound check.',
      bookingConditions: 'Events must end by 20:00. Cleaning charges apply if the hall is left untidy.',
      createdAt: timestamp(-44),
    }),
    buildResource({
      id: 'res_robotics',
      name: 'Robotics Equipment — Makerspace',
      category: 'Research Equipment',
      description:
        'Robotics development kit with an articulated arm, LiDAR sensor, motor drivers, microcontrollers and a ROS-ready workstation for autonomous systems projects.',
      image: '/images/robotics.svg',
      institutionId: 'inst_makerspace',
      institutionName: 'Hyderabad Community Makerspace',
      location: 'Kukatpally, Hyderabad',
      hourlyRate: 350,
      dailyRate: 1600,
      securityDeposit: 2000,
      requiredQualifications: ['Robotics safety certification'],
      requiredTraining: ['Makerspace induction'],
      supervisionRequired: true,
      maxBookingHours: 6,
      usageInstructions: 'Keep the emergency stop accessible and never operate the arm outside the marked zone.',
      bookingConditions: 'Community members must be verified before their first session.',
      createdAt: timestamp(-40),
    }),
    buildResource({
      id: 'res_workshop',
      name: 'Woodworking Workshop — Manufacturing Bay',
      category: 'Workshop Equipment',
      description:
        'Woodworking bay with a table saw, drill press, sanders, hand tools and a dust extraction system for furniture and model-making projects.',
      image: '/images/workshop.svg',
      institutionId: 'inst_gnit',
      institutionName: 'Guru Nanak Institute of Technology',
      location: 'Manufacturing Bay, GNIT Campus, Hyderabad',
      hourlyRate: 200,
      dailyRate: 900,
      securityDeposit: 1200,
      requiredTraining: ['Power tools safety'],
      supervisionRequired: true,
      maxBookingHours: 5,
      usageInstructions: 'Safety glasses and closed footwear are mandatory. Clean the bay before leaving.',
      bookingConditions: 'Never work alone. A workshop supervisor must be present.',
      createdAt: timestamp(-36),
    }),
    buildResource({
      id: 'res_meeting',
      name: 'Meeting Room 2A — Library',
      category: 'Meeting Rooms',
      description:
        'Quiet 10-seat meeting room with a wall-mounted display, whiteboard and video conferencing camera. Ideal for project reviews and team discussions.',
      image: '/images/meeting.svg',
      institutionId: 'inst_gnit',
      institutionName: 'Guru Nanak Institute of Technology',
      location: 'Library, Second Floor, GNIT Campus, Hyderabad',
      hourlyRate: 200,
      dailyRate: 800,
      securityDeposit: 0,
      maxBookingHours: 3,
      openTime: '09:00',
      closeTime: '19:00',
      usageInstructions: 'Keep noise levels low and erase the whiteboard after your session.',
      bookingConditions: 'Maximum 10 people. Rooms are released after 15 minutes of no-show.',
      createdAt: timestamp(-30),
    }),
    buildResource({
      id: 'res_classroom',
      name: 'Seminar Classroom — Academic Block',
      category: 'Classrooms',
      description:
        'A 60-seat smart classroom with a projector, smart board, microphones and recording support for workshops and guest sessions.',
      image: '/images/classroom.svg',
      institutionId: 'inst_gnit',
      institutionName: 'Guru Nanak Institute of Technology',
      location: 'Academic Block A, Room 105, GNIT Campus, Hyderabad',
      hourlyRate: 300,
      dailyRate: 1500,
      securityDeposit: 0,
      maxBookingHours: 6,
      usageInstructions: 'Switch off the smart board and projector after use.',
      bookingConditions: 'Academic activities take priority over external bookings.',
      createdAt: timestamp(-26),
    }),
    buildResource({
      id: 'res_microscope',
      name: 'Research Microscope — Materials Lab',
      category: 'Research Equipment',
      description:
        'Trinocular metallurgical microscope with digital camera, magnification up to 1000× and image analysis software for materials research.',
      image: '/images/research.svg',
      institutionId: 'inst_gnit',
      institutionName: 'Guru Nanak Institute of Technology',
      location: 'Materials Research Lab, Block E, GNIT Campus, Hyderabad',
      hourlyRate: 400,
      dailyRate: 1800,
      securityDeposit: 2500,
      requiredQualifications: ['Microscopy training'],
      requiredTraining: ['Lab safety induction'],
      supervisionRequired: true,
      maxBookingHours: 5,
      usageInstructions: 'Use only approved slides and clean the lens with the supplied kit.',
      bookingConditions: 'Sample preparation must be completed before the slot begins.',
      createdAt: timestamp(-22),
    }),
    buildResource({
      id: 'res_laptops',
      name: 'Laptop Cart — 20 Units',
      category: 'Computers and Laptops',
      description:
        'A mobile cart of 20 refurbished laptops with development tools pre-installed for coding workshops and outreach programmes.',
      image: '/images/computers.svg',
      institutionId: 'inst_gnit',
      institutionName: 'Guru Nanak Institute of Technology',
      location: 'IT Services, Block C, GNIT Campus, Hyderabad',
      hourlyRate: 180,
      dailyRate: 700,
      securityDeposit: 4000,
      requiredTraining: ['Lab safety induction'],
      maxBookingHours: 6,
      usageInstructions: 'Return all chargers with the cart and log any missing unit immediately.',
      bookingConditions: 'Department approval required for off-campus use.',
      createdAt: timestamp(-18),
    }),
    buildResource({
      id: 'res_cnc',
      name: 'CNC Router — Fabrication Lab',
      category: 'Manufacturing Tools',
      description:
        'Desktop CNC router for wood, acrylic and soft metal prototyping with a dust extraction unit and tooling set.',
      image: '/images/workshop.svg',
      institutionId: 'inst_innovation',
      institutionName: 'GNIT Innovation Lab',
      location: 'Fabrication Lab, Block D, GNIT Campus, Hyderabad',
      hourlyRate: 450,
      dailyRate: 2000,
      securityDeposit: 2500,
      requiredQualifications: ['CNC operator certification'],
      requiredTraining: ['Power tools safety'],
      supervisionRequired: true,
      maxBookingHours: 5,
      usageInstructions: 'Submit your toolpath file 24 hours in advance for review.',
      bookingConditions: 'Only certified operators may run the machine. A technician supervises every session.',
      createdAt: timestamp(-14),
    }),
    buildResource({
      id: 'res_studio',
      name: 'Podcast & Recording Studio',
      category: 'Other Resources',
      description:
        'Sound-treated studio with condenser microphones, audio interface, headphones and mixing software for podcasts and voice-over work.',
      image: '/images/other.svg',
      institutionId: 'inst_media',
      institutionName: 'GNIT Media Department',
      location: 'Media Studio, Block B, GNIT Campus, Hyderabad',
      hourlyRate: 250,
      dailyRate: 1000,
      securityDeposit: 1000,
      requiredTraining: ['Equipment handling briefing'],
      maxBookingHours: 4,
      usageInstructions: 'Bring an SD card or drive for recordings. Leave the studio silent and tidy.',
      bookingConditions: 'External guests must be declared before the booking starts.',
      createdAt: timestamp(-10),
    }),
  ];

  const catalogResources: Resource[] = catalog.resources.map((resource) => {
    const institution = catalogInstitutions.find(
      (row) => row.id === catalogInstitutionId(resource.institution),
    );
    return buildResource({
      id: `res_${resource.slug}`,
      name: resource.name,
      category: resource.category as Resource['category'],
      description: resource.description,
      image: CATEGORY_IMAGES[resource.category] ?? '/images/other.svg',
      institutionId: institution?.id ?? 'inst_gnit',
      institutionName: institution?.name ?? 'Guru Nanak Institute of Technology',
      location: resource.location,
      hourlyRate: resource.hourlyRate,
      dailyRate: resource.dailyRate,
      securityDeposit: resource.securityDeposit,
      maxBookingHours: resource.maxBookingHours ?? 4,
      openTime: resource.openTime ?? '08:00',
      closeTime: resource.closeTime ?? '20:00',
      requiredQualifications: resource.requiredQualifications ?? [],
      requiredTraining: resource.requiredTraining ?? [],
      supervisionRequired: resource.supervisionRequired ?? false,
      usageInstructions:
        resource.usageInstructions ??
        'Handle the equipment with care and leave the space tidy after use.',
      bookingConditions:
        resource.bookingConditions ?? 'Bookings must be cancelled at least 24 hours in advance.',
      createdAt: timestamp(-20),
    });
  });

  return [...handcrafted, ...catalogResources];
}

function buildQualifications(): UserQualification[] {
  return [
    {
      id: 'qual_1',
      userId: 'usr_user',
      name: 'Lab safety induction',
      documentName: 'lab-safety-certificate.pdf',
      status: 'verified',
      reviewerNotes: 'Verified against the central safety training register.',
      uploadedAt: timestamp(-30),
      reviewedAt: timestamp(-28),
    },
    {
      id: 'qual_2',
      userId: 'usr_user',
      name: '3D printing safety orientation',
      documentName: 'innovation-lab-orientation.pdf',
      status: 'pending',
      reviewerNotes: '',
      uploadedAt: timestamp(-3),
      reviewedAt: null,
    },
    {
      id: 'qual_3',
      userId: 'usr_priya',
      name: 'Photography fundamentals',
      documentName: 'media-coursework.pdf',
      status: 'verified',
      reviewerNotes: 'Coursework verified by the Media Department.',
      uploadedAt: timestamp(-20),
      reviewedAt: timestamp(-18),
    },
    {
      id: 'qual_4',
      userId: 'usr_priya',
      name: 'Equipment handling briefing',
      documentName: 'equipment-briefing.pdf',
      status: 'verified',
      reviewerNotes: '',
      uploadedAt: timestamp(-20),
      reviewedAt: timestamp(-19),
    },
    {
      id: 'qual_5',
      userId: 'usr_arjun',
      name: 'Robotics safety certification',
      documentName: 'robotics-safety.pdf',
      status: 'verified',
      reviewerNotes: 'Approved by the makerspace safety officer.',
      uploadedAt: timestamp(-15),
      reviewedAt: timestamp(-14),
    },
    {
      id: 'qual_6',
      userId: 'usr_arjun',
      name: 'Makerspace induction',
      documentName: 'makerspace-induction.pdf',
      status: 'verified',
      reviewerNotes: '',
      uploadedAt: timestamp(-15),
      reviewedAt: timestamp(-14),
    },
  ];
}

const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
const ongoingStart = minutesToTime(Math.max(0, nowMinutes - 30));
const ongoingEnd = minutesToTime(Math.min(23 * 60 + 59, nowMinutes + 120));

function buildBookings(): Booking[] {
  const base = {
    rejectionReason: '',
    approvedAt: null as string | null,
    rejectedAt: null as string | null,
    checkedInAt: null as string | null,
    checkedOutAt: null as string | null,
    completedAt: null as string | null,
    cancelledAt: null as string | null,
  };
  return [
    {
      ...base,
      id: 'bkg_approved_demo',
      resourceId: 'res_lab',
      userId: DEMO_SHOWCASE_USER_ID,
      ownerId: DEMO_SHOWCASE_OWNER_ID,
      startDate: date(1),
      startTime: '10:00',
      endTime: '12:00',
      purpose: 'Conducting a weekend Python workshop for the first-year coding club.',
      status: 'approved',
      totalCost: 500,
      createdAt: timestamp(-2),
      updatedAt: timestamp(-1),
      approvedAt: timestamp(-1),
    },
    {
      ...base,
      id: 'bkg_pending_demo',
      resourceId: 'res_camera',
      userId: 'usr_priya',
      ownerId: DEMO_SHOWCASE_OWNER_ID,
      startDate: date(2),
      startTime: '14:00',
      endTime: '17:00',
      purpose: 'Documentary coverage of the annual cultural festival for the college media channel.',
      status: 'pending',
      totalCost: 450,
      createdAt: timestamp(0, 4),
      updatedAt: timestamp(0, 4),
    },
    {
      ...base,
      id: 'bkg_checked_in_demo',
      resourceId: 'res_electronics',
      userId: 'usr_user',
      ownerId: DEMO_SHOWCASE_OWNER_ID,
      startDate: date(0),
      startTime: ongoingStart,
      endTime: ongoingEnd,
      purpose: 'Testing an IoT sensor board for the final-year capstone project.',
      status: 'checked_in',
      totalCost: 240,
      createdAt: timestamp(-3),
      updatedAt: timestamp(0, 2),
      approvedAt: timestamp(-2),
      checkedInAt: timestamp(0, 2),
    },
    {
      ...base,
      id: 'bkg_completed_demo',
      resourceId: 'res_printer',
      userId: 'usr_arjun',
      ownerId: DEMO_SHOWCASE_OWNER_ID,
      startDate: date(-9),
      startTime: '09:00',
      endTime: '12:00',
      purpose: 'Printing enclosure prototypes for the smart irrigation project.',
      status: 'completed',
      totalCost: 900,
      createdAt: timestamp(-12),
      updatedAt: timestamp(-9),
      approvedAt: timestamp(-11),
      checkedInAt: timestamp(-9, 1),
      checkedOutAt: timestamp(-9, -2),
      completedAt: timestamp(-9, -2),
    },
    {
      ...base,
      id: 'bkg_rejected_demo',
      resourceId: 'res_conference',
      userId: DEMO_SHOWCASE_USER_ID,
      ownerId: DEMO_SHOWCASE_OWNER_ID,
      startDate: date(-5),
      startTime: '10:00',
      endTime: '13:00',
      purpose: 'Hosting an external startup meetup.',
      status: 'rejected',
      totalCost: 1500,
      createdAt: timestamp(-8),
      updatedAt: timestamp(-7),
      rejectedAt: timestamp(-7),
      rejectionReason:
        'The hall is reserved for the institutional convocation rehearsal on that date. Please choose a slot after 6 PM or another day.',
    },
    {
      ...base,
      id: 'bkg_waitlisted_demo',
      resourceId: 'res_robotics',
      userId: 'usr_priya',
      ownerId: DEMO_SHOWCASE_OWNER_ID,
      startDate: date(3),
      startTime: '11:00',
      endTime: '14:00',
      purpose: 'Robotics demo for prospective students during the open day.',
      status: 'waitlisted',
      totalCost: 1050,
      createdAt: timestamp(-1),
      updatedAt: timestamp(-1),
    },
    {
      ...base,
      id: 'bkg_pending_robotics',
      resourceId: 'res_robotics',
      userId: 'usr_arjun',
      ownerId: DEMO_SHOWCASE_OWNER_ID,
      startDate: date(4),
      startTime: '10:00',
      endTime: '13:00',
      purpose: 'Calibrating the LiDAR module for the autonomous navigation prototype.',
      status: 'pending',
      totalCost: 1050,
      createdAt: timestamp(0, 6),
      updatedAt: timestamp(0, 6),
    },
    {
      ...base,
      id: 'bkg_cancelled_demo',
      resourceId: 'res_meeting',
      userId: 'usr_priya',
      ownerId: DEMO_SHOWCASE_OWNER_ID,
      startDate: date(-2),
      startTime: '15:00',
      endTime: '16:00',
      purpose: 'Editorial planning meeting.',
      status: 'cancelled',
      totalCost: 200,
      createdAt: timestamp(-6),
      updatedAt: timestamp(-4),
      cancelledAt: timestamp(-4),
    },
  ];
}

function buildWaitingList(): WaitingListEntry[] {
  return [
    {
      id: 'wait_1',
      resourceId: 'res_lab',
      userId: 'usr_priya',
      preferredDate: date(1),
      startTime: '10:00',
      endTime: '12:00',
      purpose: 'Video editing workshop using the lab workstations.',
      status: 'waiting',
      createdAt: timestamp(-1, 2),
    },
  ];
}

function buildCheckinRecords(): CheckinRecord[] {
  return [
    {
      id: 'chk_1',
      bookingId: 'bkg_checked_in_demo',
      userId: 'usr_user',
      checkedInAt: timestamp(0, 2),
      photos: [],
      checklist: {
        'Equipment powered on correctly': true,
        'All accessories present': true,
        'No visible physical damage': true,
        'Safety briefing acknowledged': true,
      },
      notes: 'Bench power supply shows a small scratch on the casing, noted before use.',
      damageNoted: true,
    },
    {
      id: 'chk_2',
      bookingId: 'bkg_completed_demo',
      userId: 'usr_arjun',
      checkedInAt: timestamp(-9, 1),
      photos: [],
      checklist: {
        'Equipment powered on correctly': true,
        'All accessories present': true,
        'No visible physical damage': true,
        'Safety briefing acknowledged': true,
      },
      notes: 'Printer loaded with fresh PLA spool.',
      damageNoted: false,
    },
  ];
}

function buildCheckoutRecords(): CheckoutRecord[] {
  return [
    {
      id: 'chkout_1',
      bookingId: 'bkg_completed_demo',
      userId: 'usr_arjun',
      checkedOutAt: timestamp(-9, -2),
      photos: [],
      checklist: {
        'Equipment returned in working order': true,
        'All accessories returned': true,
        'Work area cleaned': true,
        'Filament waste disposed': true,
      },
      notes: 'Prototype prints completed successfully. No damage.',
      returnedBy: 'Arjun Patel',
    },
  ];
}

function buildConditionReports(): ConditionReport[] {
  return [
    {
      id: 'cond_1',
      bookingId: 'bkg_checked_in_demo',
      resourceId: 'res_electronics',
      type: 'initial',
      images: [],
      checklist: { 'Power cable intact': true, 'Probes intact': true },
      notes: 'Pre-existing scratch noted on the bench supply casing.',
      createdAt: timestamp(0, 2),
    },
    {
      id: 'cond_2',
      bookingId: 'bkg_completed_demo',
      resourceId: 'res_printer',
      type: 'initial',
      images: [],
      checklist: { 'Nozzle clean': true, 'Bed level': true },
      notes: 'Initial condition satisfactory.',
      createdAt: timestamp(-9, 1),
    },
    {
      id: 'cond_3',
      bookingId: 'bkg_completed_demo',
      resourceId: 'res_printer',
      type: 'final',
      images: [],
      checklist: { 'Nozzle clean': true, 'Bed level': true },
      notes: 'Returned in the same condition.',
      createdAt: timestamp(-9, -2),
    },
  ];
}

function buildIncidents(): Incident[] {
  return [
    {
      id: 'inc_1',
      reporterId: 'usr_arjun',
      reporterName: 'Arjun Patel',
      resourceId: 'res_robotics',
      resourceName: 'Robotics Equipment — Makerspace',
      bookingId: null,
      category: 'damaged_equipment',
      description:
        'The gripper on the robotic arm is loose and the servo makes a grinding noise when moving above 45 degrees. We stopped the session immediately to avoid further damage.',
      images: [],
      occurredAt: timestamp(-4),
      status: 'under_review',
      managerNotes: 'Maintenance team asked to inspect the servo assembly.',
      summary: 'Reported damaged equipment on Robotics Equipment — Makerspace: loose gripper and grinding servo above 45 degrees. Session stopped.',
      createdAt: timestamp(-4),
      updatedAt: timestamp(-3),
    },
    {
      id: 'inc_2',
      reporterId: 'usr_priya',
      reporterName: 'Priya Sharma',
      resourceId: 'res_camera',
      resourceName: 'DSLR Camera Kit — Media Department',
      bookingId: null,
      category: 'late_return',
      description:
        'The previous borrower returned the camera kit almost two hours after the agreed check-out time, which delayed our shoot.',
      images: [],
      occurredAt: timestamp(-12),
      status: 'resolved',
      managerNotes: 'Borrower contacted and reminded about the return policy. No penalty imposed.',
      summary: 'Reported late return of the DSLR Camera Kit, delaying a scheduled shoot. Resolved with a policy reminder.',
      createdAt: timestamp(-12),
      updatedAt: timestamp(-10),
    },
    {
      id: 'inc_3',
      reporterId: DEMO_SHOWCASE_USER_ID,
      reporterName: 'Harshith Nagubandi',
      resourceId: 'res_conference',
      resourceName: 'Conference Room — Main Campus',
      bookingId: null,
      category: 'scheduling_conflict',
      description:
        'Two events appeared to be scheduled in the conference hall at the same time. We need a manager to confirm which booking has priority.',
      images: [],
      occurredAt: timestamp(-1),
      status: 'reported',
      managerNotes: '',
      summary: 'Reported a scheduling conflict for the Conference Room — Main Campus requiring manager review.',
      createdAt: timestamp(-1),
      updatedAt: timestamp(-1),
    },
  ];
}

function buildNotifications(): Notification[] {
  return [
    {
      id: 'notif_1',
      userId: DEMO_SHOWCASE_USER_ID,
      type: 'booking_approved',
      title: 'Booking approved',
      message: 'Your booking for Computer Laboratory — GNIT on tomorrow at 10:00 was approved.',
      link: '/dashboard/bookings',
      read: false,
      createdAt: timestamp(-1),
    },
    {
      id: 'notif_2',
      userId: DEMO_SHOWCASE_USER_ID,
      type: 'return',
      title: 'Return reminder',
      message: 'Your Electronics Testing Kit session is in progress. Remember to record final condition photos at check-out.',
      link: '/dashboard/bookings',
      read: false,
      createdAt: timestamp(0, 3),
    },
    {
      id: 'notif_3',
      userId: DEMO_SHOWCASE_USER_ID,
      type: 'incident_update',
      title: 'Incident under review',
      message: 'Your scheduling conflict report for the Conference Room is now under review.',
      link: '/dashboard/incidents',
      read: true,
      createdAt: timestamp(-1),
    },
    {
      id: 'notif_4',
      userId: DEMO_SHOWCASE_OWNER_ID,
      type: 'booking_submitted',
      title: 'New booking request',
      message: 'Priya Sharma requested the DSLR Camera Kit for tomorrow afternoon.',
      link: '/owner/bookings',
      read: false,
      createdAt: timestamp(0, 4),
    },
    {
      id: 'notif_5',
      userId: DEMO_SHOWCASE_OWNER_ID,
      type: 'incident',
      title: 'New incident reported',
      message: 'A scheduling conflict was reported for the Conference Room.',
      link: '/owner/incidents',
      read: false,
      createdAt: timestamp(-1),
    },
    {
      id: 'notif_6',
      userId: 'usr_arjun',
      type: 'booking_submitted',
      title: 'Booking request received',
      message: 'Your request for Robotics Equipment — Makerspace is awaiting owner approval.',
      link: '/dashboard/bookings',
      read: false,
      createdAt: timestamp(0, 6),
    },
    {
      id: 'notif_7',
      userId: 'usr_admin',
      type: 'system',
      title: 'Verification pending',
      message: 'Hyderabad Community Makerspace is awaiting institution verification.',
      link: '/admin/institutions',
      read: false,
      createdAt: timestamp(-3),
    },
  ];
}

function buildAuditLogs(): AuditLog[] {
  return [
    {
      id: 'audit_1',
      action: 'Resource created',
      actorId: DEMO_SHOWCASE_OWNER_ID,
      actorName: 'Rahul Verma',
      resourceId: 'res_lab',
      resourceName: 'Computer Laboratory — GNIT',
      bookingId: null,
      details: 'Created listing and activated it for bookings.',
      createdAt: timestamp(-58),
    },
    {
      id: 'audit_2',
      action: 'Booking submitted',
      actorId: 'usr_arjun',
      actorName: 'Arjun Patel',
      resourceId: 'res_robotics',
      resourceName: 'Robotics Equipment — Makerspace',
      bookingId: 'bkg_pending_robotics',
      details: 'Requested 3 hours for prototype calibration.',
      createdAt: timestamp(0, 6),
    },
    {
      id: 'audit_3',
      action: 'Booking approved',
      actorId: DEMO_SHOWCASE_OWNER_ID,
      actorName: 'Rahul Verma',
      resourceId: 'res_lab',
      resourceName: 'Computer Laboratory — GNIT',
      bookingId: 'bkg_approved_demo',
      details: 'Approved for the weekend Python workshop.',
      createdAt: timestamp(-1),
    },
    {
      id: 'audit_4',
      action: 'User checked in',
      actorId: DEMO_SHOWCASE_USER_ID,
      actorName: 'Harshith Nagubandi',
      resourceId: 'res_electronics',
      resourceName: 'Electronics Testing Kit — Electronics Laboratory',
      bookingId: 'bkg_checked_in_demo',
      details: 'Initial condition recorded with a pre-existing scratch noted.',
      createdAt: timestamp(0, 2),
    },
    {
      id: 'audit_5',
      action: 'Incident reported',
      actorId: 'usr_arjun',
      actorName: 'Arjun Patel',
      resourceId: 'res_robotics',
      resourceName: 'Robotics Equipment — Makerspace',
      bookingId: null,
      details: 'Damaged equipment reported: loose gripper and grinding servo.',
      createdAt: timestamp(-4),
    },
    {
      id: 'audit_6',
      action: 'Incident resolved',
      actorId: 'usr_manager',
      actorName: 'Meera Krishnan',
      resourceId: 'res_camera',
      resourceName: 'DSLR Camera Kit — Media Department',
      bookingId: null,
      details: 'Late return resolved with a policy reminder, no penalty imposed.',
      createdAt: timestamp(-10),
    },
    {
      id: 'audit_7',
      action: 'Resource updated',
      actorId: DEMO_SHOWCASE_OWNER_ID,
      actorName: 'Rahul Verma',
      resourceId: 'res_printer',
      resourceName: '3D Printer — Innovation Lab',
      bookingId: null,
      details: 'Availability window extended and supervision requirement confirmed.',
      createdAt: timestamp(-5),
    },
  ];
}

export async function buildSeed(hashes: Record<string, string>): Promise<Database> {
  return {
    profiles: buildProfiles(hashes),
    institutions,
    resources: buildResources(),
    bookings: buildBookings(),
    waitingList: buildWaitingList(),
    checkinRecords: buildCheckinRecords(),
    checkoutRecords: buildCheckoutRecords(),
    conditionReports: buildConditionReports(),
    incidents: buildIncidents(),
    notifications: buildNotifications(),
    auditLogs: buildAuditLogs(),
    qualifications: buildQualifications(),
    eligibilityRequirements: [],
    settings: {
      maxActiveBookings: 2,
      maxBookingsPerMonth: 6,
      maxBookingHours: 8,
      institutionPriorityEnabled: true,
      waitingListEnabled: true,
      autoApproval: false,
      overdueGraceMinutes: 30,
    },
  };
}
